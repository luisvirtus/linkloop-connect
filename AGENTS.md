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
- Database triggers reject changes to an assigned original seller in sales and subscriptions, preserving renewal commission attribution.
- Contact details are compact private JSON on companies and sellers; public QR responses never project documents or addresses.
- QR activation uses a shared form and authenticated transaction that records explicit annual consent and the agreed current price.
- Financial confirmation functions run with the caller's verified session and lock rows; paid records remain immutable to prevent duplicate or silent reversals.
- Deprecated cost columns remain historical only; operational totals use confirmed receipts minus paid commissions.
- New sales create their pending receivable through a database trigger in the same transaction to prevent missing or duplicate receipt records.
- Administrator company removal uses an authenticated atomic database function to retire the company, cancel its QR plates and delete public pages while preserving financial references.
- Keep the company-removal caller in a browser-safe module so failure propagation and the single transactional call can be tested without server transforms.
- Use shared company-state guards for active operations and printable status; exclude cancelled QR artwork but retain settled financial history in reporting.
- Print artwork uses explicit physical dimensions on a single A4 page context; avoid named child page contexts that generate empty pages around ancestor layouts.
- Client administration uses local table controls and the shared Sheet for details and editing; existing authenticated operations remain unchanged to separate presentation from business rules.
- Other management lists share RecordsTable presentation controls and SystemEditor sheets; scope management styling to system-ui so public QR pages and physical artwork stay unchanged.
- Share seller schema validation between the form and server, and mount one root Sonner toaster so invalid input and failed saves remain visible.
