# Manter o Supabase acordado

O plano gratuito do Supabase **pausa o projeto depois de 7 dias sem requisição**. Pausado,
param login, save na nuvem e ranking (os jogadores continuam vindo do `dados/br.json`).
Já aconteceu duas vezes: 10/2026 e 02/11/2026.

## As duas fontes de ping

1. **GitHub Actions** — `.github/workflows/manter-supabase.yml`, duas vezes por dia
   (09:17 e 21:47 de Brasília). Se falhar, o GitHub manda e-mail e o log diz
   "Supabase não respondeu 200".
2. **cron-job.org** (gratuito, fora do GitHub) — porque o agendamento do GitHub não é
   garantido: execuções atrasam ou são puladas sem aviso.

Uma das duas sozinha já basta; as duas juntas dão margem de sobra.

### Configurar o cron-job.org (uma vez)

1. Criar conta em https://cron-job.org (gratuito).
2. **Create cronjob**:
   - **Title:** `Catimba FC — manter Supabase`
   - **URL:** `https://leysofvftpgocigqqgzi.supabase.co/rest/v1/team?select=id&limit=1`
   - **Schedule:** todo dia, 15:00 (fora dos horários do GitHub)
3. Aba **Advanced → Headers**, adicionar os dois:
   - `apikey: sb_publishable_i5CqcTOw2U9amGelpwcuxg_d-nYXdxu`
   - `Authorization: Bearer sb_publishable_i5CqcTOw2U9amGelpwcuxg_d-nYXdxu`
   (é a chave pública do jogo, a mesma que já está no código — só lê.)
4. Aba **Notifications**: marcar "notify on failure" pra receber e-mail se falhar.
5. **Test run** → tem que dar **200**.

## Se pausar mesmo assim

- Retomar em https://supabase.com/dashboard → projeto **Prancheta FC** → *Restore*.
  Leva alguns minutos. Nada se perde.
- Enquanto isso o jogo **não quebra** (11/2026): logado vê "Nuvem fora do ar" em vez de
  slots vazios; quem já está jogando continua, com o save guardado no aparelho
  (`catimba_pendente_<usuário>_<slot>`), e ele sobe sozinho quando a nuvem volta.
  Teste: `harness_nuvem_fora.js`.

## Solução definitiva

Supabase Pro (US$ 25/mês) não pausa nunca — faz sentido quando o jogo tiver receita.
