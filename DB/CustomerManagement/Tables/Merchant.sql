CREATE TABLE [dbo].[Merchant] (
    -- The merchant's login name (the API calls it "Merchant ID").
    [Username]          NVARCHAR (50) NOT NULL,
    -- PBKDF2 output + its per-user salt (see DataAccess's PasswordHasher); never the password.
    [PasswordHash]      BINARY (32)   NOT NULL,
    [PasswordSalt]      BINARY (16)   NOT NULL,
    -- 1801 = the only role currently in use (see ai_docs/api.md).
    [RoleCode]          SMALLINT      NOT NULL,
    [LastInteractionAt] DATETIME2 (3) NULL,
    CONSTRAINT [PK_Merchant] PRIMARY KEY CLUSTERED ([Username])
);
