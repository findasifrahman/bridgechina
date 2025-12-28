# ✅ Data Ingestion Script - Working!

## Status: **OPERATIONAL**

The ingestion script has been successfully tested and is working correctly.

## ✅ What Just Worked

Successfully ingested 2 CityPlaces:
- ✅ Canton Tower
- ✅ Chen Clan Ancestral Hall

## 📍 Script Location

The script is now located at: `apps/api/scripts/ingest-cityplaces.ts`

This ensures it can properly import `@prisma/client` and other dependencies.

## 🚀 Usage

### From Project Root (Recommended):
```bash
pnpm ingest:cityplaces data/cityplaces-guangzhou.json
```

### From apps/api Directory:
```bash
cd apps/api
pnpm ingest:cityplaces data/cityplaces-guangzhou.json
```

## 📝 File Path Resolution

- Script runs from `apps/api` directory internally
- File paths should be relative to **project root**
- Example: `data/cityplaces-guangzhou.json` resolves to `C:\Users\...\brandchina\data\cityplaces-guangzhou.json`

## ⚙️ Requirements

1. **R2 Credentials** in `apps/api/.env`:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_PUBLIC_BASE_URL`

2. **Database seeded** (run `pnpm db:seed` first)

3. **City exists** in database (e.g., "guangzhou")

## 📊 What the Script Does

1. ✅ Reads JSON file with place data
2. ✅ Downloads images from URLs (if provided)
3. ✅ Generates thumbnails (300x300)
4. ✅ Uploads to Cloudflare R2
5. ✅ Creates MediaAsset records
6. ✅ Creates CityPlace records
7. ✅ Links images (first = cover, rest = gallery)

## 🎯 Next Steps

1. **Add more places**: Edit `data/cityplaces-guangzhou.json` and run again
2. **Add images**: Include `image_urls` array in JSON
3. **Verify in admin**: Check `/admin/catalog/cityplaces`

## 💡 Tips

- Script skips duplicates (by slug)
- Images are optional (can add later via admin panel)
- Script processes one place at a time
- 500ms delay between images to avoid rate limiting

