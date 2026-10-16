# Economijá

Controle financeiro pessoal: receitas, despesas fixas, parcelas e projeção dos próximos meses.

- Feito em HTML, CSS e JavaScript puro, sem backend.
- Os dados ficam salvos **no próprio aparelho** (localStorage). Cada celular tem a sua contabilidade independente, e nada é enviado para o servidor.
- Funciona offline e pode ser instalado na tela de início do iPhone.

## Instalar no iPhone

1. Abra o link do app no **Safari**.
2. Toque em **Compartilhar** (quadrado com seta) e depois em **Adicionar à Tela de Início**.
3. Use sempre pelo ícone criado.

## Backup

Aba **Lançamentos** → **Exportar backup**. No iPhone, escolha "Salvar em Arquivos" (de preferência no iCloud Drive).
Para restaurar: **Importar backup** e escolha o arquivo `.json`.

## Atualizar o app

```bash
git add .
git commit -m "feat: descrição da mudança"
git push
```

O GitHub Pages publica em cerca de 1 minuto. No iPhone, feche o app e abra de novo com internet: ele carrega a versão nova sozinho (às vezes precisa abrir duas vezes).
