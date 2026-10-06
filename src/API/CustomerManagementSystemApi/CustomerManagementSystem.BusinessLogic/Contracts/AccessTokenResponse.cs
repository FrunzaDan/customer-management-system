namespace CustomerManagementSystem.BusinessLogic.Contracts;

public sealed record AccessTokenResponse
{
    public required string AccessToken { get; init; }

    public required DateTime ExpiresAt { get; init; }
}
