using System.ComponentModel.DataAnnotations;

namespace CustomerManagementSystem.Domain.Configuration;

// The Auth section of appsettings.json, bound and validated once at startup (Program.cs), so a
// missing or invalid value stops the app with an OptionsValidationException naming the key
// instead of failing on the first request that needs it.
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    // HMAC-SHA256 needs a key of at least 256 bits; JwtSigningKey takes its ASCII bytes.
    [Required, MinLength(32)]
    public string SecureJwtKey { get; set; } = string.Empty;

    [Required]
    public string JwtIssuer { get; set; } = string.Empty;

    [Required]
    public string JwtAudience { get; set; } = string.Empty;

    [Range(1, 1440)]
    public int AccessTokenTimeoutMinutes { get; set; }
}
