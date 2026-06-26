use base64::engine::general_purpose::{STANDARD, URL_SAFE, URL_SAFE_NO_PAD};
use base64::Engine;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const APP_VERSAO: &str = env!("CARGO_PKG_VERSION");

#[derive(Deserialize)]
struct ConfiguracaoPastas {
    pasta_raiz: String,
}

#[derive(Serialize)]
struct ResultadoPreparacaoPastas {
    pasta_raiz: String,
    computador: String,
    arquivos_criados: Vec<String>,
    pastas_criadas: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SalvarPdfOficialPayload {
    nome_arquivo: String,
    base64: String,
    categoria: String,
    pasta_raiz: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultadoSalvarPdfOficial {
    pasta_raiz: String,
    caminho_arquivo: String,
    nome_arquivo: String,
    categoria: String,
    usando_pasta_temporaria: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AbrirCaminhoSistemaPayload {
    caminho: String,
    selecionar_arquivo: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObterUltimoPdfOficialPayload {
    categoria: String,
    pasta_raiz: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArquivoEmailPayload {
    nome_arquivo: String,
    mime_type: String,
    base64: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EnvioEmailPayload {
    destinatario_email: String,
    assunto: String,
    mensagem: String,
    arquivo_principal: ArquivoEmailPayload,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvioEmailResposta {
    ok: bool,
    mensagem: String,
    protocolo: String,
    enviado_em: String,
    modo: String,
}

#[derive(Deserialize)]
struct GmailTokenResponse {
    access_token: String,
}

#[derive(Serialize)]
struct GmailSendRequest<'a> {
    raw: &'a str,
    #[serde(rename = "threadId", skip_serializing_if = "Option::is_none")]
    thread_id: Option<&'a str>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GmailSendResponse {
    id: Option<String>,
    thread_id: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct GmailListaMensagensResposta {
    messages: Option<Vec<GmailMensagemReferencia>>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct GmailMensagemReferencia {
    id: String,
    thread_id: String,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct GmailThreadResposta {
    id: String,
    messages: Option<Vec<GmailMensagemResposta>>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct GmailMensagemResposta {
    id: String,
    thread_id: String,
    label_ids: Option<Vec<String>>,
    snippet: Option<String>,
    payload: Option<GmailPayload>,
    internal_date: Option<String>,
}

#[derive(Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct GmailPayload {
    mime_type: Option<String>,
    filename: Option<String>,
    headers: Option<Vec<GmailHeader>>,
    body: Option<GmailBody>,
    parts: Option<Vec<GmailPayload>>,
}

#[derive(Deserialize, Clone)]
struct GmailHeader {
    name: String,
    value: String,
}

#[derive(Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct GmailBody {
    data: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GmailEmailResumo {
    id: String,
    thread_id: String,
    remetente: String,
    assunto: String,
    data: String,
    snippet: String,
    nao_lido: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GmailAnexoResumo {
    nome_arquivo: String,
    mime_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GmailMensagemThread {
    id: String,
    remetente: String,
    destinatario: String,
    assunto: String,
    data: String,
    corpo: String,
    snippet: String,
    anexos: Vec<GmailAnexoResumo>,
    message_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GmailThreadDetalhe {
    id: String,
    assunto: String,
    reply_to: String,
    in_reply_to: String,
    references: String,
    mensagens: Vec<GmailMensagemThread>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RespostaThreadEmailPayload {
    thread_id: String,
    destinatario_email: String,
    assunto: String,
    mensagem: String,
    in_reply_to: String,
    references: String,
    anexos: Option<Vec<ArquivoEmailPayload>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NovoEmailPayload {
    destinatario_email: String,
    assunto: String,
    mensagem: String,
    anexos: Option<Vec<ArquivoEmailPayload>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GmailModifyRequest {
    remove_label_ids: Vec<String>,
    add_label_ids: Vec<String>,
}

fn normalizar_texto(valor: &str) -> String {
    valor.trim().to_string()
}

fn normalizar_base64(valor: &str) -> String {
    normalizar_texto(valor)
        .trim_start_matches("data:application/pdf;base64,")
        .split_whitespace()
        .collect::<String>()
}

fn limpar_header_email(valor: &str) -> String {
    normalizar_texto(valor).replace(['\r', '\n'], " ")
}

fn validar_email_basico(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

fn extrair_email_remetente(valor: &str) -> String {
    let texto = limpar_header_email(valor);

    if let (Some(inicio), Some(fim)) = (texto.find('<'), texto.rfind('>')) {
        if inicio < fim {
            return texto[inicio + 1..fim].trim().to_string();
        }
    }

    texto.trim_matches('"').to_string()
}

fn limpar_valor_env(valor: &str) -> String {
    valor.trim().trim_matches(['"', '\'']).to_string()
}

fn ler_variavel_configuracao_embutida(chave: &str) -> Option<String> {
    let valor = match chave {
        "EMAIL_PROVIDER" => option_env!("EMAIL_PROVIDER"),
        "GMAIL_CLIENT_ID" => option_env!("GMAIL_CLIENT_ID"),
        "GMAIL_CLIENT_SECRET" => option_env!("GMAIL_CLIENT_SECRET"),
        "GMAIL_REFRESH_TOKEN" => option_env!("GMAIL_REFRESH_TOKEN"),
        "GMAIL_SENDER_EMAIL" => option_env!("GMAIL_SENDER_EMAIL"),
        _ => None,
    }?;

    let valor_limpo = limpar_valor_env(valor);
    if valor_limpo.is_empty() {
        None
    } else {
        Some(valor_limpo)
    }
}

fn caminhos_env_possiveis() -> Vec<std::path::PathBuf> {
    let mut caminhos = Vec::new();

    if let Ok(cwd) = std::env::current_dir() {
        for base in cwd.ancestors().take(5) {
            caminhos.push(base.join(".env"));
        }
    }

    if let Some(manifest_dir) = option_env!("CARGO_MANIFEST_DIR") {
        let manifest_path = std::path::PathBuf::from(manifest_dir);
        for base in manifest_path.ancestors().take(5) {
            caminhos.push(base.join(".env"));
        }
    }

    caminhos.sort();
    caminhos.dedup();
    caminhos
}

fn ler_variavel_configuracao(chave: &str) -> Option<String> {
    if let Ok(valor) = std::env::var(chave) {
        let valor_limpo = limpar_valor_env(&valor);

        if !valor_limpo.is_empty() {
            return Some(valor_limpo);
        }
    }

    for caminho in caminhos_env_possiveis() {
        let Ok(conteudo) = std::fs::read_to_string(&caminho) else {
            continue;
        };

        for linha in conteudo.lines().map(str::trim) {
            if linha.is_empty() || linha.starts_with('#') {
                continue;
            }

            let Some((nome, valor)) = linha.split_once('=') else {
                continue;
            };

            if nome.trim() == chave {
                let valor_limpo = limpar_valor_env(valor);

                if !valor_limpo.is_empty() {
                    return Some(valor_limpo);
                }
            }
        }
    }

    ler_variavel_configuracao_embutida(chave)
}

fn gmail_configurado() -> bool {
    [
        "EMAIL_PROVIDER",
        "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
        "GMAIL_SENDER_EMAIL",
    ]
    .iter()
    .all(|chave| ler_variavel_configuracao(chave).is_some())
        && ler_variavel_configuracao("EMAIL_PROVIDER")
            .map(|valor| valor.trim().eq_ignore_ascii_case("gmail"))
            .unwrap_or(false)
}

fn quebrar_linhas(texto: &str, tamanho: usize) -> String {
    let mut linhas = Vec::new();
    let mut inicio = 0;

    while inicio < texto.len() {
        let fim = (inicio + tamanho).min(texto.len());
        linhas.push(texto[inicio..fim].to_string());
        inicio = fim;
    }

    linhas.join("\r\n")
}

fn codificar_assunto_email(assunto: &str) -> String {
    format!("=?UTF-8?B?{}?=", STANDARD.encode(assunto.as_bytes()))
}

fn normalizar_quebras_linha_email(texto: &str) -> String {
    normalizar_texto(texto).replace("\r\n", "\n").replace('\r', "\n")
}

fn escapar_html_simples(texto: &str) -> String {
    texto.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn converter_mensagem_para_html(texto: &str) -> String {
    let texto_normalizado = normalizar_quebras_linha_email(texto);
    let paragrafos = texto_normalizado
        .split("\n\n")
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(|paragrafo| {
            format!(
                "<p>{}</p>",
                escapar_html_simples(paragrafo).replace('\n', "<br/>")
            )
        })
        .collect::<Vec<_>>();

    if paragrafos.is_empty() {
        "<p></p>".to_string()
    } else {
        paragrafos.join("")
    }
}

fn construir_email_mime(
    remetente_email: &str,
    destinatario_email: &str,
    assunto: &str,
    mensagem: &str,
    nome_arquivo: &str,
    mime_type_arquivo: &str,
    base64_arquivo: &str,
) -> String {
    let anexo = ArquivoEmailPayload {
        nome_arquivo: nome_arquivo.to_string(),
        mime_type: mime_type_arquivo.to_string(),
        base64: base64_arquivo.to_string(),
    };

    construir_email_mime_com_opcoes(
        remetente_email,
        destinatario_email,
        assunto,
        mensagem,
        &[anexo],
        None,
        None,
    )
}

fn construir_email_mime_com_opcoes(
    remetente_email: &str,
    destinatario_email: &str,
    assunto: &str,
    mensagem: &str,
    anexos: &[ArquivoEmailPayload],
    in_reply_to: Option<&str>,
    references: Option<&str>,
) -> String {
    let separador = format!(
        "ibc_{}_{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duracao| duracao.as_millis())
            .unwrap_or_default()
    );
    let mensagem_normalizada = normalizar_quebras_linha_email(mensagem);
    let corpo_html = converter_mensagem_para_html(&mensagem_normalizada);
    let corpo_base64 = STANDARD.encode(corpo_html.as_bytes());
    let assunto_codificado = codificar_assunto_email(assunto);
    let mut linhas = vec![
        format!("From: {}", limpar_header_email(remetente_email)),
        format!("To: {}", limpar_header_email(destinatario_email)),
        format!("Subject: {assunto_codificado}"),
        "MIME-Version: 1.0".to_string(),
    ];

    if let Some(valor) = in_reply_to {
        let valor_limpo = limpar_header_email(valor);
        if !valor_limpo.is_empty() {
            linhas.push(format!("In-Reply-To: {valor_limpo}"));
        }
    }

    if let Some(valor) = references {
        let valor_limpo = limpar_header_email(valor);
        if !valor_limpo.is_empty() {
            linhas.push(format!("References: {valor_limpo}"));
        }
    }

    linhas.extend([
        format!("Content-Type: multipart/mixed; boundary=\"{separador}\""),
        String::new(),
        format!("--{separador}"),
        "Content-Type: text/html; charset=\"UTF-8\"".to_string(),
        "Content-Transfer-Encoding: base64".to_string(),
        String::new(),
        quebrar_linhas(&corpo_base64, 76),
        String::new(),
    ]);

    for (indice, anexo) in anexos.iter().enumerate() {
        let base64_arquivo = normalizar_base64(&anexo.base64);

        if base64_arquivo.is_empty() {
            continue;
        }

        let nome_arquivo = normalizar_texto(&anexo.nome_arquivo);
        let mime_type_arquivo = normalizar_texto(&anexo.mime_type);
        let nome_arquivo_final = if nome_arquivo.is_empty() {
            format!("documento-{}.pdf", indice + 1)
        } else {
            nome_arquivo
        };
        let nome_arquivo_seguro = nome_arquivo_final.replace(['\r', '\n', '"'], "_");
        let mime_type_final = if mime_type_arquivo.is_empty() {
            "application/pdf".to_string()
        } else {
            mime_type_arquivo
        };

        linhas.extend([
            format!("--{separador}"),
            format!("Content-Type: {mime_type_final}; name=\"{nome_arquivo_seguro}\""),
            format!("Content-Disposition: attachment; filename=\"{nome_arquivo_seguro}\""),
            "Content-Transfer-Encoding: base64".to_string(),
            String::new(),
            quebrar_linhas(&base64_arquivo, 76),
            String::new(),
        ]);
    }

    linhas.extend([format!("--{separador}--"), String::new()]);

    URL_SAFE_NO_PAD.encode(linhas.join("\r\n").as_bytes())
}

async fn carregar_access_token_gmail(
    client: &reqwest::Client,
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> Result<String, String> {
    let resposta = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|erro| format!("Falha ao conectar na autenticacao do Gmail: {erro}"))?;

    if !resposta.status().is_success() {
        let corpo = resposta.text().await.unwrap_or_default();
        return Err(format!("Falha ao autenticar no Gmail: {corpo}"));
    }

    let payload: GmailTokenResponse = resposta
        .json()
        .await
        .map_err(|erro| format!("Resposta invalida da autenticacao do Gmail: {erro}"))?;

    Ok(payload.access_token)
}

async fn carregar_contexto_gmail() -> Result<(reqwest::Client, String, String), String> {
    if !gmail_configurado() {
        return Err(
            "Gmail API nao configurado. Defina EMAIL_PROVIDER=gmail e as credenciais GMAIL_*."
                .to_string(),
        );
    }

    let client_id = ler_variavel_configuracao("GMAIL_CLIENT_ID")
        .ok_or_else(|| "GMAIL_CLIENT_ID ausente.".to_string())?;
    let client_secret = ler_variavel_configuracao("GMAIL_CLIENT_SECRET")
        .ok_or_else(|| "GMAIL_CLIENT_SECRET ausente.".to_string())?;
    let refresh_token = ler_variavel_configuracao("GMAIL_REFRESH_TOKEN")
        .ok_or_else(|| "GMAIL_REFRESH_TOKEN ausente.".to_string())?;
    let sender_email = ler_variavel_configuracao("GMAIL_SENDER_EMAIL")
        .ok_or_else(|| "GMAIL_SENDER_EMAIL ausente.".to_string())?;
    let client = reqwest::Client::new();
    let access_token =
        carregar_access_token_gmail(&client, &client_id, &client_secret, &refresh_token).await?;

    Ok((client, access_token, sender_email))
}

async fn enviar_raw_gmail(
    client: &reqwest::Client,
    access_token: &str,
    raw: &str,
    thread_id: Option<&str>,
) -> Result<GmailSendResponse, String> {
    let resposta = client
        .post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(CONTENT_TYPE, "application/json")
        .json(&GmailSendRequest { raw, thread_id })
        .send()
        .await
        .map_err(|erro| format!("Falha ao conectar no envio do Gmail: {erro}"))?;

    if !resposta.status().is_success() {
        let corpo = resposta.text().await.unwrap_or_default();
        return Err(format!("Falha no envio do email: {corpo}"));
    }

    resposta
        .json()
        .await
        .map_err(|erro| format!("Resposta invalida do Gmail: {erro}"))
}

async fn enviar_com_gmail_api(payload: EnvioEmailPayload) -> Result<EnvioEmailResposta, String> {
    let destinatario_email = normalizar_texto(&payload.destinatario_email);
    let assunto = normalizar_texto(&payload.assunto);
    let mensagem = normalizar_texto(&payload.mensagem);
    let nome_arquivo = normalizar_texto(&payload.arquivo_principal.nome_arquivo);
    let mime_type = normalizar_texto(&payload.arquivo_principal.mime_type);
    let base64_arquivo = normalizar_base64(&payload.arquivo_principal.base64);

    if !validar_email_basico(&destinatario_email) {
        return Err("Digite um email valido.".to_string());
    }
    if assunto.is_empty() {
        return Err("Informe o assunto do email.".to_string());
    }
    if mensagem.is_empty() {
        return Err("Digite a mensagem do email.".to_string());
    }
    if base64_arquivo.is_empty() {
        return Err("PDF principal ausente no envio.".to_string());
    }

    let (client, access_token, sender_email) = carregar_contexto_gmail().await?;
    let raw = construir_email_mime(
        &sender_email,
        &destinatario_email,
        &assunto,
        &mensagem,
        if nome_arquivo.is_empty() {
            "documento.pdf"
        } else {
            &nome_arquivo
        },
        if mime_type.is_empty() {
            "application/pdf"
        } else {
            &mime_type
        },
        &base64_arquivo,
    );

    let payload_resposta = enviar_raw_gmail(&client, &access_token, &raw, None).await?;

    Ok(envio_resposta_padrao(payload_resposta))
}

fn obter_header(headers: &[GmailHeader], nome: &str) -> String {
    headers
        .iter()
        .find(|header| header.name.eq_ignore_ascii_case(nome))
        .map(|header| limpar_header_email(&header.value))
        .unwrap_or_default()
}

fn headers_mensagem(mensagem: &GmailMensagemResposta) -> Vec<GmailHeader> {
    mensagem
        .payload
        .as_ref()
        .and_then(|payload| payload.headers.clone())
        .unwrap_or_default()
}

fn data_mensagem(mensagem: &GmailMensagemResposta, headers: &[GmailHeader]) -> String {
    let data_header = obter_header(headers, "Date");

    if !data_header.is_empty() {
        return data_header;
    }

    mensagem
        .internal_date
        .as_ref()
        .and_then(|valor| valor.parse::<i64>().ok())
        .and_then(|millis| time::OffsetDateTime::from_unix_timestamp(millis / 1000).ok())
        .and_then(|data| {
            data.format(&time::format_description::well_known::Rfc3339)
                .ok()
        })
        .unwrap_or_default()
}

fn decodificar_base64_gmail(valor: &str) -> Option<String> {
    let texto = normalizar_texto(valor);
    let bytes = URL_SAFE_NO_PAD
        .decode(texto.as_bytes())
        .or_else(|_| URL_SAFE.decode(texto.as_bytes()))
        .or_else(|_| STANDARD.decode(texto.as_bytes()))
        .ok()?;

    String::from_utf8(bytes).ok()
}

fn limpar_html_simples(html: &str) -> String {
    let mut texto = String::with_capacity(html.len());
    let mut dentro_tag = false;

    for caractere in html.chars() {
        match caractere {
            '<' => dentro_tag = true,
            '>' => {
                dentro_tag = false;
                texto.push(' ');
            }
            _ if !dentro_tag => texto.push(caractere),
            _ => {}
        }
    }

    texto
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn buscar_corpo_por_mime(payload: &GmailPayload, mime_desejado: &str) -> Option<String> {
    let mime_type = payload.mime_type.as_deref().unwrap_or_default();

    if mime_type.starts_with(mime_desejado) {
        if let Some(data) = payload.body.as_ref().and_then(|body| body.data.as_ref()) {
            if let Some(corpo) = decodificar_base64_gmail(data) {
                return Some(corpo);
            }
        }
    }

    payload.parts.as_ref().and_then(|partes| {
        partes
            .iter()
            .find_map(|parte| buscar_corpo_por_mime(parte, mime_desejado))
    })
}

fn extrair_corpo_payload(payload: &GmailPayload) -> String {
    if let Some(corpo) = buscar_corpo_por_mime(payload, "text/plain") {
        return corpo.trim().to_string();
    }

    if let Some(corpo_html) = buscar_corpo_por_mime(payload, "text/html") {
        return limpar_html_simples(&corpo_html);
    }

    payload
        .body
        .as_ref()
        .and_then(|body| body.data.as_ref())
        .and_then(|data| decodificar_base64_gmail(data))
        .unwrap_or_default()
}

fn extrair_anexos_payload(payload: &GmailPayload, anexos: &mut Vec<GmailAnexoResumo>) {
    let nome_arquivo = normalizar_texto(payload.filename.as_deref().unwrap_or_default());

    if !nome_arquivo.is_empty() {
        anexos.push(GmailAnexoResumo {
            nome_arquivo,
            mime_type: normalizar_texto(payload.mime_type.as_deref().unwrap_or_default()),
        });
    }

    if let Some(partes) = payload.parts.as_ref() {
        for parte in partes {
            extrair_anexos_payload(parte, anexos);
        }
    }
}

fn mensagem_para_resumo(mensagem: GmailMensagemResposta) -> GmailEmailResumo {
    let headers = headers_mensagem(&mensagem);
    let data = data_mensagem(&mensagem, &headers);
    let label_ids = mensagem.label_ids.unwrap_or_default();

    GmailEmailResumo {
        id: mensagem.id,
        thread_id: mensagem.thread_id,
        remetente: obter_header(&headers, "From"),
        assunto: obter_header(&headers, "Subject"),
        data,
        snippet: mensagem.snippet.unwrap_or_default(),
        nao_lido: label_ids.iter().any(|label| label == "UNREAD"),
    }
}

fn montar_references(references: &str, in_reply_to: &str) -> String {
    let references_limpo = limpar_header_email(references);
    let in_reply_to_limpo = limpar_header_email(in_reply_to);

    if in_reply_to_limpo.is_empty() || references_limpo.contains(&in_reply_to_limpo) {
        return references_limpo;
    }

    normalizar_texto(&format!("{references_limpo} {in_reply_to_limpo}"))
}

fn envio_resposta_padrao(payload_resposta: GmailSendResponse) -> EnvioEmailResposta {
    let protocolo = payload_resposta
        .id
        .or(payload_resposta.thread_id)
        .unwrap_or_else(|| format!("gmail-{}", chrono_like_timestamp()));

    EnvioEmailResposta {
        ok: true,
        mensagem: "E-mail enviado com sucesso.".to_string(),
        protocolo,
        enviado_em: iso_timestamp_now(),
        modo: "gmail-api".to_string(),
    }
}

fn chrono_like_timestamp() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duracao| duracao.as_millis())
        .unwrap_or_default()
}

fn iso_timestamp_now() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

#[tauri::command]
async fn enviar_email_documento(payload: EnvioEmailPayload) -> Result<EnvioEmailResposta, String> {
    enviar_com_gmail_api(payload).await
}

#[tauri::command]
async fn listar_emails_gmail(
    query: Option<String>,
    max_results: Option<u32>,
) -> Result<Vec<GmailEmailResumo>, String> {
    let (client, access_token, _) = carregar_contexto_gmail().await?;
    let query_gmail =
        normalizar_texto(query.as_deref().unwrap_or("in:inbox newer_than:30d").trim());
    let max_results_texto = max_results.unwrap_or(30).clamp(1, 50).to_string();

    let resposta = client
        .get("https://gmail.googleapis.com/gmail/v1/users/me/messages")
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .query(&[
            ("q", query_gmail.as_str()),
            ("maxResults", max_results_texto.as_str()),
        ])
        .send()
        .await
        .map_err(|erro| format!("Falha ao buscar emails no Gmail: {erro}"))?;

    if !resposta.status().is_success() {
        let corpo = resposta.text().await.unwrap_or_default();
        return Err(format!("Falha ao buscar emails no Gmail: {corpo}"));
    }

    let lista: GmailListaMensagensResposta = resposta
        .json()
        .await
        .map_err(|erro| format!("Resposta invalida da lista do Gmail: {erro}"))?;
    let mut emails = Vec::new();
    let mut threads_vistas = std::collections::HashSet::new();

    for referencia in lista.messages.unwrap_or_default() {
        if !threads_vistas.insert(referencia.thread_id.clone()) {
            continue;
        }

        let url = format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}",
            referencia.id
        );
        let resposta_mensagem = client
            .get(url)
            .header(AUTHORIZATION, format!("Bearer {access_token}"))
            .query(&[
                ("format", "metadata"),
                ("metadataHeaders", "From"),
                ("metadataHeaders", "Subject"),
                ("metadataHeaders", "Date"),
            ])
            .send()
            .await
            .map_err(|erro| format!("Falha ao carregar resumo do email: {erro}"))?;

        if !resposta_mensagem.status().is_success() {
            let corpo = resposta_mensagem.text().await.unwrap_or_default();
            return Err(format!("Falha ao carregar resumo do email: {corpo}"));
        }

        let mensagem: GmailMensagemResposta = resposta_mensagem
            .json()
            .await
            .map_err(|erro| format!("Resumo de email invalido: {erro}"))?;
        emails.push(mensagem_para_resumo(mensagem));
    }

    Ok(emails)
}

#[tauri::command]
async fn buscar_thread_gmail(thread_id: String) -> Result<GmailThreadDetalhe, String> {
    let thread_id = normalizar_texto(&thread_id);

    if thread_id.is_empty() {
        return Err("Conversa nao identificada.".to_string());
    }

    let (client, access_token, sender_email) = carregar_contexto_gmail().await?;
    let url = format!("https://gmail.googleapis.com/gmail/v1/users/me/threads/{thread_id}");
    let resposta = client
        .get(url)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .query(&[("format", "full")])
        .send()
        .await
        .map_err(|erro| format!("Falha ao abrir conversa no Gmail: {erro}"))?;

    if !resposta.status().is_success() {
        let corpo = resposta.text().await.unwrap_or_default();
        return Err(format!("Falha ao abrir conversa no Gmail: {corpo}"));
    }

    let thread: GmailThreadResposta = resposta
        .json()
        .await
        .map_err(|erro| format!("Conversa invalida no Gmail: {erro}"))?;
    let sender_email_lower = sender_email.to_lowercase();
    let mut mensagens = Vec::new();
    let mut reply_to = String::new();
    let mut assunto_thread = String::new();
    let mut ultimo_message_id = String::new();
    let mut ultimas_references = String::new();

    for mensagem in thread.messages.unwrap_or_default() {
        let headers = headers_mensagem(&mensagem);
        let remetente = obter_header(&headers, "From");
        let destinatario = obter_header(&headers, "To");
        let assunto = obter_header(&headers, "Subject");
        let message_id = obter_header(&headers, "Message-ID");
        let references = obter_header(&headers, "References");
        let mut anexos = Vec::new();
        let corpo = mensagem
            .payload
            .as_ref()
            .map(extrair_corpo_payload)
            .unwrap_or_default();

        if let Some(payload) = mensagem.payload.as_ref() {
            extrair_anexos_payload(payload, &mut anexos);
        }

        if assunto_thread.is_empty() && !assunto.is_empty() {
            assunto_thread = assunto.clone();
        }

        if !remetente.to_lowercase().contains(&sender_email_lower) {
            reply_to = extrair_email_remetente(&remetente);
        }

        if !message_id.is_empty() {
            ultimo_message_id = message_id.clone();
        }

        if !references.is_empty() {
            ultimas_references = references.clone();
        }

        mensagens.push(GmailMensagemThread {
            id: mensagem.id.clone(),
            remetente,
            destinatario,
            assunto,
            data: data_mensagem(&mensagem, &headers),
            corpo,
            snippet: mensagem.snippet.unwrap_or_default(),
            anexos,
            message_id,
        });
    }

    if reply_to.is_empty() {
        reply_to = mensagens
            .last()
            .map(|mensagem| extrair_email_remetente(&mensagem.remetente))
            .unwrap_or_default();
    }

    Ok(GmailThreadDetalhe {
        id: if thread.id.is_empty() {
            thread_id
        } else {
            thread.id
        },
        assunto: assunto_thread,
        reply_to,
        in_reply_to: ultimo_message_id.clone(),
        references: montar_references(&ultimas_references, &ultimo_message_id),
        mensagens,
    })
}

#[tauri::command]
async fn responder_thread_gmail(
    payload: RespostaThreadEmailPayload,
) -> Result<EnvioEmailResposta, String> {
    let thread_id = normalizar_texto(&payload.thread_id);
    let destinatario_email = extrair_email_remetente(&payload.destinatario_email);
    let assunto = normalizar_texto(&payload.assunto);
    let mensagem = normalizar_texto(&payload.mensagem);
    let anexos = payload.anexos.unwrap_or_default();

    if thread_id.is_empty() {
        return Err("Conversa nao identificada.".to_string());
    }
    if !validar_email_basico(&destinatario_email) {
        return Err("Digite um email valido.".to_string());
    }
    if assunto.is_empty() {
        return Err("Informe o assunto do email.".to_string());
    }
    if mensagem.is_empty() {
        return Err("Digite a mensagem do email.".to_string());
    }

    let (client, access_token, sender_email) = carregar_contexto_gmail().await?;
    let raw = construir_email_mime_com_opcoes(
        &sender_email,
        &destinatario_email,
        &assunto,
        &mensagem,
        &anexos,
        Some(&payload.in_reply_to),
        Some(&payload.references),
    );
    let resposta = enviar_raw_gmail(&client, &access_token, &raw, Some(&thread_id)).await?;

    Ok(envio_resposta_padrao(resposta))
}

#[tauri::command]
async fn enviar_email_simples_gmail(
    payload: NovoEmailPayload,
) -> Result<EnvioEmailResposta, String> {
    let destinatario_email = extrair_email_remetente(&payload.destinatario_email);
    let assunto = normalizar_texto(&payload.assunto);
    let mensagem = normalizar_texto(&payload.mensagem);
    let anexos = payload.anexos.unwrap_or_default();

    if !validar_email_basico(&destinatario_email) {
        return Err("Digite um email valido.".to_string());
    }
    if assunto.is_empty() {
        return Err("Informe o assunto do email.".to_string());
    }
    if mensagem.is_empty() {
        return Err("Digite a mensagem do email.".to_string());
    }

    let (client, access_token, sender_email) = carregar_contexto_gmail().await?;
    let raw = construir_email_mime_com_opcoes(
        &sender_email,
        &destinatario_email,
        &assunto,
        &mensagem,
        &anexos,
        None,
        None,
    );
    let resposta = enviar_raw_gmail(&client, &access_token, &raw, None).await?;

    Ok(envio_resposta_padrao(resposta))
}

#[tauri::command]
async fn marcar_email_lido_gmail(message_id: String) -> Result<(), String> {
    let message_id = normalizar_texto(&message_id);

    if message_id.is_empty() {
        return Err("Email nao identificado.".to_string());
    }

    let (client, access_token, _) = carregar_contexto_gmail().await?;
    let url =
        format!("https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify");
    let resposta = client
        .post(url)
        .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header(CONTENT_TYPE, "application/json")
        .json(&GmailModifyRequest {
            remove_label_ids: vec!["UNREAD".to_string()],
            add_label_ids: Vec::new(),
        })
        .send()
        .await
        .map_err(|erro| format!("Falha ao marcar email como lido: {erro}"))?;

    if !resposta.status().is_success() {
        let corpo = resposta.text().await.unwrap_or_default();
        return Err(format!("Falha ao marcar email como lido: {corpo}"));
    }

    Ok(())
}

fn nome_computador() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Computador sem nome".to_string())
}

fn subpastas_padrao() -> Vec<&'static str> {
    vec![
        "dados",
        "documentos",
        "documentos/declaracoes",
        "documentos/prestacoes",
        "documentos/programacoes",
        "documentos/emails",
        "backups",
        "modelos",
        "assinaturas",
        "logs",
    ]
}

fn ler_env_nao_vazio(chave: &str) -> Option<String> {
    std::env::var(chave)
        .ok()
        .map(|valor| valor.trim().to_string())
        .filter(|valor| !valor.is_empty())
}

fn resolver_pasta_raiz_oficial(
    app: &tauri::AppHandle,
    pasta_raiz_informada: &str,
) -> Result<(PathBuf, bool), String> {
    if let Some(pasta_env) = ler_env_nao_vazio("IBC_DATA_DIR") {
        return Ok((PathBuf::from(pasta_env), false));
    }

    let pasta_informada = pasta_raiz_informada.trim();
    if !pasta_informada.is_empty() {
        return Ok((PathBuf::from(pasta_informada), false));
    }

    if let Ok(download_dir) = app.path().download_dir() {
        return Ok((download_dir.join("Sistema IBC").join(APP_VERSAO), true));
    }

    let pasta_app = app
        .path()
        .app_data_dir()
        .map_err(|erro| format!("Nao foi possivel resolver a pasta local do app: {erro}"))?;

    Ok((pasta_app.join("ibc-data").join(APP_VERSAO), true))
}

fn garantir_subpastas_oficiais(pasta_raiz: &Path) -> Result<(), String> {
    std::fs::create_dir_all(pasta_raiz).map_err(|erro| erro.to_string())?;

    for subpasta in subpastas_padrao() {
        std::fs::create_dir_all(pasta_raiz.join(subpasta)).map_err(|erro| erro.to_string())?;
    }

    Ok(())
}

fn limpar_nome_arquivo_segmento(valor: &str) -> String {
    let texto = valor.trim();
    let mut resultado = String::with_capacity(texto.len());
    let mut ultimo_foi_espaco = false;

    for caractere in texto.chars() {
        let invalido = matches!(caractere, '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|')
            || caractere.is_control();
        let caractere_final = if invalido { ' ' } else { caractere };

        if caractere_final.is_whitespace() {
            if !ultimo_foi_espaco {
                resultado.push(' ');
                ultimo_foi_espaco = true;
            }
        } else {
            resultado.push(caractere_final);
            ultimo_foi_espaco = false;
        }
    }

    resultado.trim_matches([' ', '.']).trim().to_string()
}

fn garantir_nome_arquivo_pdf_seguro(nome_arquivo: &str) -> String {
    let nome_limpo = limpar_nome_arquivo_segmento(nome_arquivo);

    if nome_limpo.is_empty() {
        return "DOCUMENTO - SEM NOME.pdf".to_string();
    }

    if nome_limpo.to_ascii_lowercase().ends_with(".pdf") {
        nome_limpo
    } else {
        format!("{nome_limpo}.pdf")
    }
}

fn resolver_pasta_categoria(pasta_raiz: &Path, categoria: &str) -> PathBuf {
    let categoria_normalizada = categoria.trim().to_ascii_lowercase();
    let subpasta = match categoria_normalizada.as_str() {
        "prestacoes" => "documentos/prestacoes",
        "programacoes" => "documentos/programacoes",
        _ => "documentos/declaracoes",
    };

    pasta_raiz.join(subpasta)
}

fn obter_ultimo_pdf_da_pasta(pasta: &Path) -> Result<PathBuf, String> {
    let entradas = std::fs::read_dir(pasta)
        .map_err(|erro| format!("Nao foi possivel listar a pasta de PDFs: {erro}"))?;
    let mut candidatos = Vec::new();

    for entrada in entradas {
        let entrada = entrada.map_err(|erro| format!("Nao foi possivel ler a pasta de PDFs: {erro}"))?;
        let caminho = entrada.path();

        if !caminho.is_file() {
            continue;
        }

        let extensao = caminho
            .extension()
            .and_then(|valor| valor.to_str())
            .unwrap_or_default();

        if !extensao.eq_ignore_ascii_case("pdf") {
            continue;
        }

        let metadata = entrada
            .metadata()
            .map_err(|erro| format!("Nao foi possivel ler os dados do PDF: {erro}"))?;
        let modificado_em = metadata
            .modified()
            .map_err(|erro| format!("Nao foi possivel ler a data do PDF: {erro}"))?;

        candidatos.push((modificado_em, caminho));
    }

    candidatos.sort_by(|a, b| b.0.cmp(&a.0));

    candidatos
        .into_iter()
        .next()
        .map(|(_, caminho)| caminho)
        .ok_or_else(|| "Nenhum PDF foi encontrado nesta pasta.".to_string())
}

#[cfg(target_os = "windows")]
fn abrir_caminho_no_windows(caminho: &Path, selecionar_arquivo: bool) -> Result<(), String> {
    if selecionar_arquivo && caminho.is_file() {
        std::process::Command::new("explorer.exe")
            .arg(format!("/select,{}", caminho.to_string_lossy()))
            .spawn()
            .map_err(|erro| format!("Nao foi possivel abrir o caminho no Windows: {erro}"))?;
        return Ok(());
    }

    if caminho.is_file() {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &caminho.to_string_lossy()])
            .spawn()
            .map_err(|erro| format!("Nao foi possivel abrir o arquivo no Windows: {erro}"))?;
        return Ok(());
    }

    std::process::Command::new("explorer.exe")
        .arg(caminho)
        .spawn()
        .map_err(|erro| format!("Nao foi possivel abrir o caminho no Windows: {erro}"))?;

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn abrir_caminho_no_windows(_caminho: &Path, _selecionar_arquivo: bool) -> Result<(), String> {
    Err("Abrir caminho automaticamente so esta implementado no Windows.".to_string())
}

fn resolver_caminho_pdf_unico(pasta_destino: &Path, nome_base: &str) -> PathBuf {
    let nome_arquivo = garantir_nome_arquivo_pdf_seguro(nome_base);
    let caminho_inicial = pasta_destino.join(&nome_arquivo);

    if !caminho_inicial.exists() {
        return caminho_inicial;
    }

    let caminho_path = Path::new(&nome_arquivo);
    let stem = caminho_path
        .file_stem()
        .and_then(|valor| valor.to_str())
        .unwrap_or("DOCUMENTO");
    let extensao = caminho_path
        .extension()
        .and_then(|valor| valor.to_str())
        .unwrap_or("pdf");

    for indice in 2..10000 {
        let candidato = pasta_destino.join(format!("{stem} ({indice}).{extensao}"));
        if !candidato.exists() {
            return candidato;
        }
    }

    pasta_destino.join(format!("{stem}-{}.{}", chrono_like_timestamp(), extensao))
}

#[tauri::command]
fn preparar_pastas_compartilhadas(
    configuracao: ConfiguracaoPastas,
) -> Result<ResultadoPreparacaoPastas, String> {
    let pasta_raiz = std::path::PathBuf::from(configuracao.pasta_raiz.trim());

    if pasta_raiz.as_os_str().is_empty() {
        return Err("Informe a pasta raiz compartilhada.".to_string());
    }

    garantir_subpastas_oficiais(&pasta_raiz)?;

    let pastas_criadas = subpastas_padrao()
        .iter()
        .map(|subpasta| pasta_raiz.join(subpasta).to_string_lossy().to_string())
        .collect::<Vec<_>>();

    let computador = nome_computador();
    let agora = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|erro| erro.to_string())?
        .as_secs();
    let configuracao_json = serde_json::json!({
      "versao": 1,
      "pastaRaiz": pasta_raiz.to_string_lossy(),
      "pastas": {
      "dados": "dados",
      "documentos": "documentos",
      "declaracoes": "documentos/declaracoes",
      "prestacoes": "documentos/prestacoes",
      "programacoes": "documentos/programacoes",
      "emails": "documentos/emails",
      "backups": "backups",
      "modelos": "modelos",
      "assinaturas": "assinaturas",
      "logs": "logs"
      },
      "atualizadoPor": computador,
      "atualizadoEmUnix": agora
    });
    let lock_json = serde_json::json!({
      "computador": computador,
      "abertoEmUnix": agora,
      "observacao": "Controle simples para avisar uso em outro computador."
    });
    let arquivo_configuracao = pasta_raiz.join("dados").join("configuracao.json");
    let arquivo_lock = pasta_raiz.join("dados").join("lock.json");

    std::fs::write(
        &arquivo_configuracao,
        serde_json::to_string_pretty(&configuracao_json).map_err(|erro| erro.to_string())?,
    )
    .map_err(|erro| erro.to_string())?;
    std::fs::write(
        &arquivo_lock,
        serde_json::to_string_pretty(&lock_json).map_err(|erro| erro.to_string())?,
    )
    .map_err(|erro| erro.to_string())?;

    Ok(ResultadoPreparacaoPastas {
        pasta_raiz: pasta_raiz.to_string_lossy().to_string(),
        computador,
        arquivos_criados: vec![
            arquivo_configuracao.to_string_lossy().to_string(),
            arquivo_lock.to_string_lossy().to_string(),
        ],
        pastas_criadas,
    })
}

#[tauri::command]
fn salvar_pdf_oficial(
    app: tauri::AppHandle,
    payload: SalvarPdfOficialPayload,
) -> Result<ResultadoSalvarPdfOficial, String> {
    let base64_limpo = normalizar_base64(&payload.base64);

    if base64_limpo.is_empty() {
        return Err("PDF ausente para salvamento oficial.".to_string());
    }

    let bytes = STANDARD
        .decode(base64_limpo.as_bytes())
        .map_err(|erro| format!("PDF invalido para salvar: {erro}"))?;
    let (pasta_raiz, usando_pasta_temporaria) =
        resolver_pasta_raiz_oficial(&app, &payload.pasta_raiz)?;

    garantir_subpastas_oficiais(&pasta_raiz)?;

    let pasta_destino = resolver_pasta_categoria(&pasta_raiz, &payload.categoria);
    std::fs::create_dir_all(&pasta_destino).map_err(|erro| erro.to_string())?;

    let caminho_arquivo = resolver_caminho_pdf_unico(&pasta_destino, &payload.nome_arquivo);
    std::fs::write(&caminho_arquivo, bytes).map_err(|erro| erro.to_string())?;

    Ok(ResultadoSalvarPdfOficial {
        pasta_raiz: pasta_raiz.to_string_lossy().to_string(),
        caminho_arquivo: caminho_arquivo.to_string_lossy().to_string(),
        nome_arquivo: caminho_arquivo
            .file_name()
            .and_then(|valor| valor.to_str())
            .unwrap_or("documento.pdf")
            .to_string(),
        categoria: payload.categoria,
        usando_pasta_temporaria,
    })
}

#[tauri::command]
fn abrir_caminho_sistema(payload: AbrirCaminhoSistemaPayload) -> Result<(), String> {
    let caminho = PathBuf::from(payload.caminho.trim());

    if caminho.as_os_str().is_empty() {
        return Err("Caminho nao informado.".to_string());
    }

    if !caminho.exists() {
        return Err("O caminho informado nao existe mais.".to_string());
    }

    abrir_caminho_no_windows(&caminho, payload.selecionar_arquivo.unwrap_or(false))
}

#[tauri::command]
fn obter_ultimo_pdf_oficial(
    app: tauri::AppHandle,
    payload: ObterUltimoPdfOficialPayload,
) -> Result<String, String> {
    let categoria = normalizar_texto(&payload.categoria);
    let (pasta_raiz, usando_pasta_temporaria) =
        resolver_pasta_raiz_oficial(&app, &payload.pasta_raiz)?;

    if usando_pasta_temporaria {
        return Err(
            "A pasta base do sistema ainda nao foi configurada. Configure-a antes de abrir a programacao mensal."
                .to_string(),
        );
    }

    let pasta_categoria = resolver_pasta_categoria(&pasta_raiz, &categoria);

    if !pasta_categoria.exists() {
        return Err("A pasta oficial desta categoria ainda nao existe.".to_string());
    }

    let caminho = obter_ultimo_pdf_da_pasta(&pasta_categoria)?;
    Ok(caminho.to_string_lossy().to_string())
}

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_local_first_tables",
        sql: r#"
      CREATE TABLE IF NOT EXISTS kv_store (
        chave TEXT PRIMARY KEY NOT NULL,
        valor_json TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documentos_emitidos (
        id TEXT PRIMARY KEY NOT NULL,
        tipo TEXT NOT NULL,
        aluno TEXT NOT NULL,
        nome_documento TEXT NOT NULL,
        nome_arquivo_pdf TEXT NOT NULL,
        caminho_pdf TEXT NOT NULL,
        status_documento TEXT NOT NULL,
        enviado_por_email INTEGER NOT NULL DEFAULT 0,
        email_destinatario TEXT NOT NULL DEFAULT '',
        enviado_em TEXT NOT NULL DEFAULT '',
        status_envio TEXT NOT NULL DEFAULT 'nao_enviado',
        emitido_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        origem TEXT NOT NULL DEFAULT '',
        dados_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_emitido_em
        ON documentos_emitidos (emitido_em);
      CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_aluno
        ON documentos_emitidos (aluno);
      CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_tipo
        ON documentos_emitidos (tipo);
    "#,
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ibc.sqlite", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            preparar_pastas_compartilhadas,
            salvar_pdf_oficial,
            abrir_caminho_sistema,
            obter_ultimo_pdf_oficial,
            enviar_email_documento,
            listar_emails_gmail,
            buscar_thread_gmail,
            responder_thread_gmail,
            enviar_email_simples_gmail,
            marcar_email_lido_gmail
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
