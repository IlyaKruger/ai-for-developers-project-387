# Changelog

## [1.1.0](https://github.com/IlyaKruger/ai-for-developers-project-387/compare/v1.0.0...v1.1.0) (2026-10-30)


### Features

* add Claude Code agent GitHub Actions workflow ([628fcce](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/628fcce8d3a30e47815e59aacf3b7b6d69c861e0))
* **booking:** тема разговора (Topic) в бронировании ([e0428e6](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/e0428e6912da3fa43ce859935eca1cb9244e37be)), closes [#6](https://github.com/IlyaKruger/ai-for-developers-project-387/issues/6) [#7](https://github.com/IlyaKruger/ai-for-developers-project-387/issues/7) [#8](https://github.com/IlyaKruger/ai-for-developers-project-387/issues/8)
* **ci:** add auto-triage job for new issues ([c2d362c](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/c2d362cef6c91c19df7e953eb70c049767e83318))
* **ci:** Lighthouse-аудит по расписанию с агентом на claude-code-action ([bcef966](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/bcef9666ea347b744c52b7c640d52ce3dbcec79b))


### Bug Fixes

* **ci:** add claude_code_oauth_token for GitHub App auth ([ebad3f7](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/ebad3f786ae9a2f24bc77f8b11a67caba7d737e4))
* **ci:** add use_sticky_comment to auto-triage so response is posted ([25c6b19](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/25c6b193586de688a10690d0185ad1940f7ee7f1))
* **ci:** allow all bots to trigger auto-review (bot-created PRs must be reviewed) ([35cfeaf](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/35cfeaf10eff7297aaf6f80dfd973574f72a1d06))
* **ci:** allow gh CLI in auto-triage and pass issue content in prompt ([e8e3235](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/e8e3235e70c198edd7730031c08b3f731a3dcf4d))
* **ci:** allow github-actions bot to trigger claude triage ([daa41b8](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/daa41b8cb082dedefb09ae13bf250502991d0ae2))
* **ci:** allowed_bots expects login without [bot] suffix ([1785389](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/17853895f4fac199c140c72306f53d54d4dd3275))
* **ci:** allowlist npm/git/gh in claude job settings for implement-spec ([a44027b](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/a44027b981b775b35f23b18112399a7d73784539))
* **ci:** auto-triage posts /claude comment instead of direct prompt ([fb9e585](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/fb9e58511595b0713ed8b88028ef355adfaa101d))
* **ci:** auto-triage prompt with direct instructions instead of skill ([8b04df2](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/8b04df247f92a79a4fa838d003b6381ea8e71ec5))
* **ci:** explicit gh pr comment in auto-review; add gh api/cat/grep to allowlist ([8e5aafb](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/8e5aafbfa2f4c23def268bcf1850831eb07ab981))
* **ci:** grant contents:write and pass github_token to claude job for implement-spec ([ba802e2](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/ba802e2e04ab6de29a9e4e1a1136df705abc5366))
* **ci:** pass CLAUDE_CODE_OAUTH_TOKEN to action ([18ded58](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/18ded5845b8baef723c817183a69ad50374ec39c))
* **ci:** remove explicit oauth token, rely on GitHub App OIDC ([ed03a68](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/ed03a6821d9137d5472aef0843b5dde230f9a5a3))
* **ci:** remove unsupported timeout_minutes param from auto-review action ([e997627](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/e99762742eba70c2f788e670e94f910d2f270c9f))
* **ci:** restore direct prompt for auto-triage with explicit github_token ([5bc5fb9](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/5bc5fb9a52a35ee30b85f3e40d755e411126c503))
* **ci:** skip claude action when PR budget exhausted via step output ([9fbd00d](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/9fbd00d66dcc4da60d1af7d81c59d8ef63ddf4d9))
* **ci:** use correct param name 'prompt' instead of 'direct_prompt' ([184cbf3](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/184cbf37830135e7121dcd4737ed389147fe1ca0))
* **ci:** use PR head SHA (not merge commit) in playwright artifact name ([dfc3bbd](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/dfc3bbd0ff7123a0d4162ff3ed0c23bf7f2bfb0b))
* create ~/.claude dir before copying skills ([2cdbcc4](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/2cdbcc4b31e6da4883c75659eb5884e041564131))
* remove invalid params and let action handle trigger/auth ([74a3ff1](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/74a3ff1b5d6a71f0b907bf28a08be940903cd107))

## 1.0.0 (2026-10-29)


### Features

* port calendar-booking app from project-386 ([09639d6](https://github.com/IlyaKruger/ai-for-developers-project-387/commit/09639d66deff7c0ff994f23fd8c9f7bb154ee809))
