CREATE TABLE [dbo].[CustomerAddress]
(
    [CustomerId] UNIQUEIDENTIFIER NOT NULL,
    [Country] NVARCHAR (100) NOT NULL,
    [County] NVARCHAR (100) NOT NULL,
    [PostalCode] VARCHAR (20) NOT NULL,
    [City] NVARCHAR (100) NOT NULL,
    [Street] NVARCHAR (100) NOT NULL,
    [StreetNumber] NVARCHAR (50) NOT NULL,
    CONSTRAINT [PK_CustomerAddress] PRIMARY KEY CLUSTERED ([CustomerId]),
    CONSTRAINT [FK_CustomerAddress_Customer]
        FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customer] ([CustomerId])
);
