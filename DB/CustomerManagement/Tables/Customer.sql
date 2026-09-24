CREATE TABLE [dbo].[Customer]
(
    [CustomerId] UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT [DF_Customer_CustomerId] DEFAULT NEWSEQUENTIALID(),
    [FirstName] NVARCHAR (100) NOT NULL,
    [LastName] NVARCHAR (100) NOT NULL,
    [Email] NVARCHAR (254) NOT NULL,
    [PhoneNumber] VARCHAR (15) NOT NULL,
    [Gender] TINYINT NOT NULL
        CONSTRAINT [DF_Customer_Gender] DEFAULT 0,
    [BirthDate] DATE NULL,
    [StatusCode] SMALLINT NOT NULL
        CONSTRAINT [DF_Customer_StatusCode] DEFAULT 1901,
    [CreatedAt] DATETIME2 (3) NOT NULL
        CONSTRAINT [DF_Customer_CreatedAt] DEFAULT SYSUTCDATETIME(),
    [LastInteractionAt] DATETIME2 (3) NOT NULL
        CONSTRAINT [DF_Customer_LastInteractionAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_Customer] PRIMARY KEY CLUSTERED ([CustomerId]),
    CONSTRAINT [UQ_Customer_Email] UNIQUE ([Email]),
    CONSTRAINT [UQ_Customer_PhoneNumber] UNIQUE ([PhoneNumber]),
    CONSTRAINT [CK_Customer_Gender] CHECK ([Gender] IN (0, 1, 2)),
    CONSTRAINT [CK_Customer_StatusCode] CHECK ([StatusCode] IN (1901, 1903, 1904))
);
GO

CREATE INDEX [IX_Customer_LastName_FirstName]
    ON [dbo].[Customer] ([LastName], [FirstName]);
