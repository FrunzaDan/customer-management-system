namespace CustomerManagementSystem.Domain.Models;

// No [Required] here: AuthService.GetAccessToken is the single place that validates these
// fields, so every missing-credentials case gets the same 400 with one message.
public sealed class MerchantCredentials
{
    public string? Username { get; set; }

    public string? Password { get; set; }
}