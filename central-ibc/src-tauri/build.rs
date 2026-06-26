use std::fs;
use std::path::{Path, PathBuf};

fn caminhos_env_possiveis() -> Vec<PathBuf> {
    let mut caminhos = Vec::new();

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let manifest_path = PathBuf::from(manifest_dir);
        for base in manifest_path.ancestors().take(5) {
            caminhos.push(base.join(".env"));
        }
    }

    caminhos.sort();
    caminhos.dedup();
    caminhos
}

fn ler_valor_env_em_arquivo(caminho: &Path, chave: &str) -> Option<String> {
    let conteudo = fs::read_to_string(caminho).ok()?;

    for linha in conteudo.lines().map(str::trim) {
        if linha.is_empty() || linha.starts_with('#') {
            continue;
        }

        let Some((nome, valor)) = linha.split_once('=') else {
            continue;
        };

        if nome.trim() == chave {
            let valor_limpo = valor.trim().trim_matches(['"', '\'']).to_string();
            if !valor_limpo.is_empty() {
                return Some(valor_limpo);
            }
        }
    }

    None
}

fn propagar_variavel(chave: &str) {
    if let Ok(valor) = std::env::var(chave) {
        if !valor.trim().is_empty() {
            println!("cargo:rustc-env={chave}={valor}");
            return;
        }
    }

    for caminho in caminhos_env_possiveis() {
        println!("cargo:rerun-if-changed={}", caminho.display());

        if let Some(valor) = ler_valor_env_em_arquivo(&caminho, chave) {
            println!("cargo:rustc-env={chave}={valor}");
            return;
        }
    }
}

fn main() {
    for chave in [
        "EMAIL_PROVIDER",
        "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
        "GMAIL_SENDER_EMAIL",
    ] {
        propagar_variavel(chave);
    }

    tauri_build::build()
}
