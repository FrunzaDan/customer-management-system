using System.ComponentModel.DataAnnotations;

namespace CustomerManagementSystem.Domain.Configuration;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    [Required, MinLength(32)]
    public string SecureJwtKey { get; set; } = string.Empty;

    [Required]
    public string JwtIssuer { get; set; } = string.Empty;

    [Required]
    public string JwtAudience { get; set; } = string.Empty;

    [Range(1, 1440)]
    public int AccessTokenTimeoutMinutes { get; set; }
}
