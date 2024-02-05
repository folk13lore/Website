//! `SeaORM` Entity. Generated by sea-orm-codegen 0.11.2

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "genre")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub name: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::metadata_to_genre::Entity")]
    MetadataToGenre,
}

impl Related<super::metadata::Entity> for Entity {
    fn to() -> RelationDef {
        super::metadata_to_genre::Relation::Metadata.def()
    }
    fn via() -> Option<RelationDef> {
        Some(super::metadata_to_genre::Relation::Genre.def().rev())
    }
}

impl ActiveModelBehavior for ActiveModel {}
