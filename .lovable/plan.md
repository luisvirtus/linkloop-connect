# Plaquinhas com QR Code — Arquitetura e Plano

Sistema novo, do zero: venda e gestão de plaquinhas físicas com QR Code único, página pública tipo Linktree, assinatura anual, comissões e controle financeiro.

## 1. Papéis e acessos

- **Cliente/Empresa** — entra com Google, vincula a plaquinha lendo o QR, edita os links, bloqueia/desbloqueia, renova assinatura.
- **Vendedor** — vê apenas suas vendas, renovações e comissões (pendentes e pagas).
- **Administrador** — controle total: estoque, lotes, clientes, vendedores, vendas, assinaturas, pagamentos, comissões, custos, financeiro, configurações, auditoria e "entrar como cliente".

Papéis ficam em tabela separada (`user_roles`) com verificação no servidor. Nenhum cliente enxerga dados de outro, mesmo trocando o identificador na URL.

## 2. Fluxos principais

**Cliente (o caminho curto):**

```text
comprou -> entra no site -> login Google -> escaneia/digita o código
-> sistema valida disponibilidade -> confirma vínculo -> configura links -> pronto
```

**Consumidor:** escaneia -> `/q/CODIGO` -> página pública da empresa.

**Assinatura vencida:** página pública continua no ar mostrando nome da empresa e site (se houver); edição bloqueada com a mensagem "Para alterar as informações da sua página, é necessário renovar sua assinatura." e botão de renovação. Nada é apagado; após o pagamento tudo volta como estava.

**Bloqueio:** o cliente bloqueia/desbloqueia sozinho, inclusive com assinatura vencida. Plaquinha bloqueada mostra página neutra "indisponível no momento".

**Renovação e comissão:** a renovação identifica o vendedor da venda original e gera comissão automática com o percentual de renovação.

## 3. Modelo de dados

| Tabela | Conteúdo principal |
| --- | --- |
| `profiles` | dados básicos do usuário (vindo do Google) |
| `user_roles` | papel: admin / vendedor / cliente |
| `sellers` | vendedor, dados de contato, status |
| `companies` | empresa do cliente: nome, logo, site, dono |
| `batches` | lotes de produção: quantidade, tamanho, data, custo unitário |
| `plates` | número sequencial, código do QR (único), tamanho, status, lote, empresa, vendedor, datas, custo, observações |
| `pages` | página pública ligada à plaquinha: título, logo, tema, bloqueada sim/não |
| `page_links` | links (Google, WhatsApp, Instagram, site, outros), rótulo, URL, ordem, ativo |
| `sales` | plaquinha, cliente, vendedor, data, valor, forma e status de pagamento |
| `subscriptions` | empresa, início, vencimento, valor, status, referência Stripe |
| `payments` | tipo (plaquinha/assinatura/renovação), valor, status, referência Stripe |
| `commissions` | vendedor, origem (venda ou renovação), base, percentual, valor, status, data de pagamento |
| `settings` | preço da plaquinha, valor da assinatura, % venda, % renovação, custo padrão |
| `audit_logs` | usuário, data/hora, ação, alvo, detalhes |

Regras no banco: código do QR com índice único; uma plaquinha pertence a no máximo uma empresa; status da plaquinha entre DISPONÍVEL, RESERVADA, VENDIDA, VINCULADA, DOADA, EXTRAVIADA, BLOQUEADA, CANCELADA.

Segurança por linha: cliente só lê/escreve o que é dele; vendedor só o que é dele; admin tudo; página pública liberada apenas para leitura dos campos exibidos.

## 4. QR Code e estoque

- Código aleatório curto e único por plaquinha, apontando sempre para `https://dominio/q/CODIGO` — nunca direto para Google/WhatsApp.
- Admin gera lotes (ex.: 1.000 unidades) informando tamanho e custo; o sistema cria os registros, os códigos e os QR Codes.
- Exportação para impressão: arte pronta nos tamanhos 10x10, 15x15 e 20x20 cm, quadrada, com QR em destaque e a chamada "Avalie nossa empresa no Google"; download em PDF/PNG por lote ou unidade.
- Painel de estoque com totais: produzidas, disponíveis, vendidas, vinculadas, doadas, extraviadas, bloqueadas.

## 5. Pagamentos (Stripe)

Assinatura anual e renovação pelo Stripe, com confirmação apenas via webhook — voltar da tela de sucesso nunca libera nada. Histórico de pagamentos ligado à assinatura e ao financeiro. Valor da assinatura e preço da plaquinha vêm das configurações, nunca fixos no código.

## 6. Financeiro

Receita (plaquinhas + assinaturas + renovações) − custos − comissões = resultado, calculado automaticamente, com recebidos x pendentes.

## 7. Telas

**Público:** home de apresentação, `/q/CODIGO` (página Linktree mobile-first).
**Cliente:** login Google, vincular plaquinha, editor de links, assinatura/renovação, bloqueio.
**Vendedor:** vendas, renovações, comissões.
**Admin:** dashboard, plaquinhas, estoque/lotes, clientes, vendedores, vendas, assinaturas, pagamentos, comissões, financeiro, configurações, auditoria, "entrar como cliente".

## 8. Ordem de entrega

1. Backend: banco, papéis, permissões, auditoria, configurações.
2. Login com Google + vinculação da plaquinha.
3. Página pública + editor de links + bloqueio.
4. Estoque, lotes, geração de QR e artes para impressão.
5. Assinatura e Stripe (webhooks) + regras de vencimento.
6. Vendas, vendedores, comissões e financeiro.
7. Painel admin completo, "entrar como cliente" e auditoria.

## Detalhes técnicos

- Backend: Lovable Cloud (banco, autenticação Google, funções de servidor) com segurança por linha em todas as tabelas.
- Funções de servidor para: vinculação de plaquinha, geração de lotes, checkout e webhooks Stripe, cálculo de comissões, impersonação auditada.
- Geração de QR no servidor; artes de impressão em PDF vetorial por tamanho.
- Página pública renderizada no servidor, mobile-first, carga mínima.
- Pagamentos via integração Stripe da Lovable (requer plano elegível); enquanto não habilitada, a assinatura fica em modo manual controlado pelo admin.

## Pontos a confirmar

- Vendedor pode registrar a venda ele mesmo, ou toda venda é lançada pelo admin?
- A plaquinha já sai vendida com a primeira assinatura anual inclusa, ou a assinatura é cobrada à parte desde o início?
