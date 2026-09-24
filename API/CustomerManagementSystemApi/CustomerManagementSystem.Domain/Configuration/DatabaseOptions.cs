using System.ComponentModel.DataAnnotations;

namespace CustomerManagementSystem.Domain.Configuration;

// The ConnectionStrings section of appsettings.json, bound and validated once at startup
// (Program.cs). SqlConnectionFactory picks one of the two by operating system. Override either per
// machine with user-secrets or the ConnectionStrings__Docker / ConnectionStrings__LocalSqlServer
// environment variables rather than editing the file.
public sealed class DatabaseOptions
{
    public const string SectionName = "ConnectionStrings";

    // Azure SQL Edge in Docker: the only choice on macOS (SQL Server has no macOS build) and the
    // first choice on Windows.
    [Required]
    public string Docker { get; set; } = string.Empty;

    // SQL Server installed directly on Windows (Windows authentication), used only when the Docker
    // container can't be reached. Ignored on other operating systems.
    public string? LocalSqlServer { get; set; }
}
