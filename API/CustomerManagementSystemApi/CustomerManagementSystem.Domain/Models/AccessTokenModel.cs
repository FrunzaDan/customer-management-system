namespace CustomerManagementSystem.Domain.Models;

public sealed record AccessTokenResponse
{
    public required string AccessToken { get; init; }

    // UTC — serialized as ISO 8601 with a trailing "Z".
    public required DateTime ValidUntil { get; init; }
}
