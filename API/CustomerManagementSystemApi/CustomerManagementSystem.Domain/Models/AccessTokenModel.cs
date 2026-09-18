namespace CustomerManagementSystem.Domain.Models;

public sealed class AccessTokenResponse
{
    public string? AccessToken { get; set; }

    public string? ValidUntil { get; set; }
}