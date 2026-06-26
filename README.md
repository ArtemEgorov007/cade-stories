# Cade Stories

Статическая копия white-page [ES_cadestories_Cade-Stories](https://github.com/ArtemEgorov007/cade-stories) — образовательный портал о blockchain, IA y seguridad digital.

**Live:** https://artemegorov007.github.io/cade-stories/

## Обновление из исходника

Исходник — PHP в `frontend-landings/projects/ES_cadestories_Cade-Stories/`.

```bash
php export_static.php . "https://artemegorov007.github.io/cade-stories"
# из папки исходника, указав путь к этому репо как OUTPUT_DIR
git add -A && git commit -m "chore: refresh static export" && git push
```

GitHub Pages раздаёт только статику; PHP на Pages не работает.
