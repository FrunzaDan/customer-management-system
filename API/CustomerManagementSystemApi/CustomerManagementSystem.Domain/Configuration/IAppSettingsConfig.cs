namespace CustomerManagementSystem.Domain.Configuration;

public interface IAppSettingsConfig
{
    string SecureJwtKey { get; }
    string JwtIssuer { get; }
    string JwtAudience { get; }
    string AccessTokenTimeout { get; }
    string CustomerManagementSystemDbWindows { get; }
    string CustomerManagementSystemDbDocker { get; }
}