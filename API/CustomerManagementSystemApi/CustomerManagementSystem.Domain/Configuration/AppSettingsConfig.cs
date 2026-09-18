using Microsoft.Extensions.Configuration;

namespace CustomerManagementSystem.Domain.Configuration;

public class AppSettingsConfig(IConfiguration configuration) : IAppSettingsConfig
{
    public string SecureJwtKey => configuration["Auth:SecureJWTKey"] ??
                                  throw new ArgumentNullException(nameof(SecureJwtKey),
                                      "The config value SecureJWTKey cannot be null.");

    public string JwtIssuer => configuration["Auth:JWTIssuer"] ??
                               throw new ArgumentNullException(nameof(JwtIssuer),
                                   "The config value JWTIssuer cannot be null.");

    public string JwtAudience => configuration["Auth:JWTAudience"] ??
                                 throw new ArgumentNullException(nameof(JwtAudience),
                                     "The config value JWTAudience cannot be null.");

    public string AccessTokenTimeout => configuration["Auth:AccessTokenTimeout"] ??
                                        throw new ArgumentNullException(nameof(AccessTokenTimeout),
                                            "The config value AccessTokenTimeout cannot be null.");

    public string CustomerManagementSystemDbWindows =>
        configuration["ConnectionStrings:CustomerManagementSystemDB_Windows"] ?? throw new ArgumentNullException(
            nameof(CustomerManagementSystemDbWindows),
            "The config value CustomerManagementSystemDB_Windows cannot be null.");

    public string CustomerManagementSystemDbDocker =>
        configuration["ConnectionStrings:CustomerManagementSystemDB_Docker"] ?? throw new ArgumentNullException(
            nameof(CustomerManagementSystemDbDocker),
            "The config value CustomerManagementSystemDB_Docker cannot be null.");
}