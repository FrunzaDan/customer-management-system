using System.Text.Json.Serialization;

namespace CustomerManagementSystem.Domain.Models;

public sealed class ResponseModel<T>(int status, string? responseMessage = null, T? data = default,
    string? field = null)
{
    public int Status { get; } = status;
    public string? ResponseMessage { get; } = responseMessage;
    public T? Data { get; } = data;

    /// <summary>The request property a failure is about, such as "Email", so the error can be shown next to it.</summary>
    [JsonIgnore]
    public string? Field { get; } = field;
}
