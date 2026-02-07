table "orders" {
  schema = schema.budgethair
  column "id" {
    type = int
    auto_increment = true
  }
  column "orderId" {
    type = varchar(100)
    null = true
  }
  column "customerName" {
    type = varchar(255)
  }
  column "customerPhone" {
    type = varchar(50)
  }
  column "productType" {
    type = varchar(100)
  }
  column "productSubtype" {
    type = varchar(100)
  }
  column "quantity" {
    type = int
  }
  column "returnedQuantity" {
    type = int
    null = true
    default = 0
  }
  column "returnType" {
    type = enum("full", "partial")
    null = true
  }
  column "returnedAt" {
    type = datetime
    null = true
  }
  column "cancelledAt" {
    type = datetime
    null = true
  }
  column "totalAmount" {
    type = decimal(10,2)
  }
  column "amountPaid" {
    type = decimal(10,2)
    null = true
    default = 0.00
  }
  column "paymentStatus" {
    type = varchar(50)
    default = "unpaid"
  }
  column "deliveryLocation" {
    type = text
  }
  column "deliveryStatus" {
    type = varchar(50)
    default = "pending"
  }
  column "notes" {
    type = text
    null = true
  }
  column "workerNotes" {
    type = text
    null = true
  }
  column "workerName" {
    type = varchar(100)
    null = true
  }
  column "workerNotesUpdatedAt" {
    type = timestamp
    null = true
  }
  column "priority" {
    type = enum("normal", "high")
    null = true
    default = "normal"
  }
  column "deliveredBy" {
    type = varchar(100)
    null = true
  }
  column "deliveredAt" {
    type = datetime
    null = true
  }
  column "createdAt" {
    type = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updatedAt" {
    type = timestamp
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "orderId" {
    unique = true
    columns = [column.orderId]
  }
  index "paymentStatus" {
    columns = [column.paymentStatus]
  }
  index "deliveryStatus" {
    columns = [column.deliveryStatus]
  }
  index "priority" {
    columns = [column.priority]
  }
}

table "stock" {
  schema = schema.budgethair
  column "id" {
    type = int
    auto_increment = true
  }
  column "productType" {
    type = varchar(100)
  }
  column "productSubtype" {
    type = varchar(100)
  }
  column "quantity" {
    type = int
    default = 0
  }
  column "created_at" {
    type = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    type = timestamp
    default = sql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "product_type_subtype" {
    unique = true
    columns = [column.productType, column.productSubtype]
  }
  index "productType" {
    columns = [column.productType]
  }
}

table "stock_history" {
  schema = schema.budgethair
  column "id" {
    type = int
    auto_increment = true
  }
  column "productType" {
    type = varchar(100)
  }
  column "productSubtype" {
    type = varchar(100)
  }
  column "quantity" {
    type = int
    null = true
  }
  column "oldQuantity" {
    type = int
    null = true
  }
  column "newQuantity" {
    type = int
    null = true
  }
  column "action" {
    type = enum("added", "edited", "deducted", "restored")
  }
  column "timestamp" {
    type = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "timestamp" {
    columns = [column.timestamp]
  }
  index "product" {
    columns = [column.productType, column.productSubtype]
  }
}

table "subscriptions" {
  schema = schema.budgethair
  column "id" {
    type = int
    auto_increment = true
  }
  column "endpoint" {
    type = text
  }
  column "expiration_time" {
    type = bigint
    null = true
  }
  column "p256dh" {
    type = text
  }
  column "auth" {
    type = text
  }
  column "created_at" {
    type = timestamp
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
}

schema "budgethair" {
  charset = "utf8mb4"
  collate = "utf8mb4_unicode_ci"
}
