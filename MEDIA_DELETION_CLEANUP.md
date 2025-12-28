# Media Deletion & Database Cleanup

## Overview

When you delete an image from the media library, the system **automatically cleans up all database associations** to prevent orphaned references.

## What Gets Cleaned Up

### 1. Cover Image References (`cover_asset_id`)

When a media asset is deleted, all `cover_asset_id` fields that reference it are set to `NULL` in:

- ✅ Cities
- ✅ Hotels
- ✅ Restaurants
- ✅ Medical Centers
- ✅ Tours
- ✅ Transport Products
- ✅ Products
- ✅ City Places
- ✅ Guide Profiles
- ✅ eSIM Plans

### 2. Gallery Image Arrays (`gallery_asset_ids`)

The deleted asset ID is automatically removed from all `gallery_asset_ids` JSON arrays in:

- ✅ Cities
- ✅ Hotels
- ✅ Restaurants
- ✅ Medical Centers
- ✅ Tours
- ✅ Transport Products
- ✅ Products
- ✅ City Places

## How It Works

The deletion endpoint (`DELETE /api/admin/media/:id`) performs these steps:

1. **Permission Check**: Verifies user can delete (owner or admin)
2. **Cleanup Phase 1**: Sets all `cover_asset_id` references to `NULL`
3. **Cleanup Phase 2**: Removes asset ID from all `gallery_asset_ids` arrays
4. **Deletion**: Deletes the media asset record from database
5. **R2 Cleanup**: (TODO) Delete files from Cloudflare R2

## Technical Implementation

The cleanup uses **raw SQL queries** for efficiency:

```sql
-- Clear cover references
UPDATE cities SET cover_asset_id = NULL WHERE cover_asset_id = 'asset-id';
UPDATE hotels SET cover_asset_id = NULL WHERE cover_asset_id = 'asset-id';
-- ... etc for all entity types

-- Remove from gallery arrays
UPDATE cities 
SET gallery_asset_ids = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements_text(gallery_asset_ids) elem
  WHERE elem::text != 'asset-id'
)
WHERE gallery_asset_ids::text LIKE '%asset-id%';
-- ... etc for all entity types
```

## Result

After deletion:
- ✅ No orphaned `cover_asset_id` references
- ✅ No broken `gallery_asset_ids` arrays
- ✅ Entities remain intact (just without the deleted image)
- ✅ No foreign key constraint errors
- ✅ Database stays consistent

## Example

**Before deletion:**
- Hotel "Grand Hotel" has `cover_asset_id = "abc123"`
- Hotel "Grand Hotel" has `gallery_asset_ids = ["abc123", "def456", "ghi789"]`

**After deleting asset "abc123":**
- Hotel "Grand Hotel" has `cover_asset_id = NULL`
- Hotel "Grand Hotel" has `gallery_asset_ids = ["def456", "ghi789"]`

## Bulk Deletion

The bulk deletion endpoint (`DELETE /api/admin/media/bulk`) currently does **NOT** clean up references. This should be enhanced in the future to also perform cleanup.

## Future Enhancements

1. **R2 File Deletion**: Currently marked as TODO - should delete actual files from Cloudflare R2
2. **Bulk Cleanup**: Add reference cleanup to bulk deletion endpoint
3. **Audit Logging**: Log which entities were affected by media deletion
4. **Soft Delete**: Option to "soft delete" (mark as deleted) instead of hard delete

## Testing

To test the cleanup:
1. Upload an image to media library
2. Attach it to a hotel as cover image
3. Add it to a restaurant's gallery
4. Delete the image from media library
5. Verify:
   - Hotel's `cover_asset_id` is now `NULL`
   - Restaurant's `gallery_asset_ids` no longer contains the deleted ID

