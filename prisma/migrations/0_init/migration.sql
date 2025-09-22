BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[ExpenseReport] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [month] INT NOT NULL,
    [year] INT NOT NULL,
    [description] NVARCHAR(1000),
    [exportedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExpenseReport_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExpenseReport_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExpenseReport_userId_year_month_key] UNIQUE NONCLUSTERED ([userId],[year],[month])
);

-- CreateTable
CREATE TABLE [dbo].[ExpenseLine] (
    [id] NVARCHAR(1000) NOT NULL,
    [reportId] NVARCHAR(1000) NOT NULL,
    [date] DATETIME2 NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(10,2) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [ExpenseLine_currency_df] DEFAULT 'EUR',
    [receiptUrl] NVARCHAR(1000),
    [ocrProcessed] BIT NOT NULL CONSTRAINT [ExpenseLine_ocrProcessed_df] DEFAULT 0,
    [ocrData] NVARCHAR(1000),
    [metadata] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExpenseLine_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExpenseLine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CustomerSuggestion] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [usageCount] INT NOT NULL CONSTRAINT [CustomerSuggestion_usageCount_df] DEFAULT 1,
    [lastUsed] DATETIME2 NOT NULL CONSTRAINT [CustomerSuggestion_lastUsed_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CustomerSuggestion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CustomerSuggestion_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[ColleagueSuggestion] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [usageCount] INT NOT NULL CONSTRAINT [ColleagueSuggestion_usageCount_df] DEFAULT 1,
    [lastUsed] DATETIME2 NOT NULL CONSTRAINT [ColleagueSuggestion_lastUsed_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ColleagueSuggestion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ColleagueSuggestion_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [User_email_idx] ON [dbo].[User]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExpenseReport_userId_year_month_idx] ON [dbo].[ExpenseReport]([userId], [year], [month]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExpenseLine_reportId_date_idx] ON [dbo].[ExpenseLine]([reportId], [date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExpenseLine_type_idx] ON [dbo].[ExpenseLine]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CustomerSuggestion_name_idx] ON [dbo].[CustomerSuggestion]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ColleagueSuggestion_name_idx] ON [dbo].[ColleagueSuggestion]([name]);

-- AddForeignKey
ALTER TABLE [dbo].[ExpenseReport] ADD CONSTRAINT [ExpenseReport_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ExpenseLine] ADD CONSTRAINT [ExpenseLine_reportId_fkey] FOREIGN KEY ([reportId]) REFERENCES [dbo].[ExpenseReport]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

