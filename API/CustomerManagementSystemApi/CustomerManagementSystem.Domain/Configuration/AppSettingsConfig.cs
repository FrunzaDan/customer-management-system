using Microsoft.Extensions.Configuration;

namespace CustomerManagementSystem.Domain.Configuration;

public class AppSettingsConfig(IConfiguration configuration) : IAppSettingsConfig
{
    public string SecureJwtKey => configuration["Auth:SecureJWTKey"] ??
                                  throw new InvalidOperationException("Missing Auth:SecureJWTKey configuration.");

    public string JwtIssuer => configuration["Auth:JWTIssuer"] ??
                               throw new InvalidOperationException("Missing Auth:JWTIssuer configuration.");

    public string JwtAudience => configuration["Auth:JWTAudience"] ??
                                 throw new InvalidOperationException("Missing Auth:JWTAudience configuration.");

    public string AccessTokenTimeout => configuration["Auth:AccessTokenTimeout"] ??
                                        throw new InvalidOperationException("Missing Auth:AccessTokenTimeout configuration.");

    // The one database connection (ConnectionStrings:DefaultConnection). appsettings.json holds the
    // local Docker SQL Server's; override it per machine with user-secrets or the
    // ConnectionStrings__DefaultConnection environment variable rather than editing the file.
    public string DefaultConnection => configuration.GetConnectionString("DefaultConnection") ??
                                       throw new InvalidOperationException(
                                           "Missing ConnectionStrings:DefaultConnection configuration.");
}