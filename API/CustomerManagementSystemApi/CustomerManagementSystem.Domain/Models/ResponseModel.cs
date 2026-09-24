namespace CustomerManagementSystem.Domain.Models;

public sealed class ResponseModel<T>(int status, string? responseMessage = null, T? data = default)
{
    public int Status { get; } = status;
    public string? ResponseMessage { get; } = responseMessage;
    public T? Data { get; } = data;
}
