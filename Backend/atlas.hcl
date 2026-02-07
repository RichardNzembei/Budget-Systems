env "local" {
  src = "file://schema.hcl"
  url = "mysql://budgethair_user:BudgetSystems@localhost:3306/budgethair"
  dev = "mysql://budgethair_user:BudgetSystems@localhost:3306/budgethair_dev"
  
  migration {
    dir = "file://migrations"
  }
  
  # Auto-approve for local development
  diff {
    skip {
      drop_schema = true
      drop_table  = true
    }
  }
}

env "production" {
  src = "file://schema.hcl"
  url = getenv("DATABASE_URL")
  
  migration {
    dir = "file://migrations"
  }
}
