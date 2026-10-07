<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- A impressão individual usa uma rota autenticada e um server function com RLS e verificação explícita de posse/atribuição/papel; o QR permanece apontando para `/q/CÓDIGO` para evitar exposição de placas por ID e reimpressões quando links mudam.
- A assinatura preserva o vendedor da venda original em vínculo próprio; toda comissão de renovação usa esse vínculo imutável, nunca uma busca atual nas plaquinhas.
- Plate activation runs in one authenticated database transaction with a row lock; all related records roll back together to prevent partial or duplicate sales.
- Public company information is projected by QR-code-scoped functions; base company rows remain private to owners and administrators.
