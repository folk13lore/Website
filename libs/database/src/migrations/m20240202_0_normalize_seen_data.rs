use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        if manager.has_column("seen", "extra_information").await? {
            let db = manager.get_connection();
            db.execute_unprepared(
                r#"
ALTER TABLE seen ADD COLUMN show_extra_information JSONB;
ALTER TABLE seen ADD COLUMN podcast_extra_information JSONB;
ALTER TABLE seen ADD COLUMN anime_extra_information JSONB;
ALTER TABLE seen ADD COLUMN manga_extra_information JSONB;

UPDATE seen SET show_extra_information = extra_information -> 'Show' WHERE extra_information -> 'Show' IS NOT NULL;
UPDATE seen SET podcast_extra_information = extra_information -> 'Podcast' WHERE extra_information -> 'Podcast' IS NOT NULL;
UPDATE seen SET anime_extra_information = extra_information -> 'Anime' WHERE extra_information -> 'Anime' IS NOT NULL;
UPDATE seen SET manga_extra_information = extra_information -> 'Manga' WHERE extra_information -> 'Manga' IS NOT NULL;

ALTER TABLE seen DROP COLUMN extra_information;
"#,
)
.await?;
        }
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}
