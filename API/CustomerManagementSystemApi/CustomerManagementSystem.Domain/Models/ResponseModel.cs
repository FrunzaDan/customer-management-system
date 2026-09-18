namespace CustomerManagementSystem.Domain.Models;

public class ResponseModel<T>(int? status = null, string? responseMessage = null, T? data = default)
{
    public int? Status { get; set; } = status;
    public string? ResponseMessage { get; set; } = responseMessage;
    public T? Data { get; set; } = data;
}