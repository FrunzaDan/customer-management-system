namespace CustomerManagementSystem.Domain.Models;

// The uniform envelope every endpoint returns. Status is the HTTP status the controller
// replies with; Data is typed per endpoint (object, and always null, for mutations that
// return nothing).
public sealed class ResponseModel<T>(int status, string? responseMessage = null, T? data = default)
{
    public int Status { get; } = status;
    public string? ResponseMessage { get; } = responseMessage;
    public T? Data { get; } = data;
}
