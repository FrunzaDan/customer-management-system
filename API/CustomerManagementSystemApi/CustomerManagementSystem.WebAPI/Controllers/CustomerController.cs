using System.Text;
using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomerController(ICustomerService customerService) : ApiControllerBase
{
    private string Username => User.Identity!.Name!;

    [HttpPost("create")]
    public async Task<ActionResult<ResponseModel<Guid?>>> CreateCustomer(
        [FromBody] CreateCustomerRequest request, CancellationToken cancellationToken) =>
        Reply(await customerService.CreateCustomerAsync(request, Username, cancellationToken));

    [HttpGet("get")]
    public async Task<ActionResult<ResponseModel<CustomerModel>>> GetCustomer([FromQuery] string? searchTerm,
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomerAsync(searchTerm, cancellationToken));

    [HttpGet("all")]
    public async Task<ActionResult<ResponseModel<PagedResponse<CustomerModel>>>> GetCustomers(
        [FromQuery] GetCustomersRequest request, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomersAsync(request, cancellationToken));

    [HttpGet("export")]
    public async Task<IActionResult> ExportCustomers([FromQuery] ExportCustomersRequest request,
        CancellationToken cancellationToken)
    {
        var response = await customerService.GetCustomersForExportAsync(request, cancellationToken);
        if (response is not { Status: 200, Data: { } csv })
            return Reply(response);

        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", $"customers_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    [HttpGet("audit-log")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<AuditLogEntry>>>> GetCustomerAuditLog(
        [FromQuery] Guid customerId, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomerAuditLogAsync(customerId, cancellationToken));

    [HttpGet("audit-log/all")]
    public async Task<ActionResult<ResponseModel<PagedResponse<GlobalAuditLogEntry>>>> GetAllCustomerAuditLog(
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default) =>
        Reply(await customerService.GetAllCustomerAuditLogAsync(pageNumber, pageSize, cancellationToken));

    [HttpGet("monthly-activity")]
    public async Task<ActionResult<ResponseModel<MonthlyActivityModel>>> GetMonthlyActivity(
        CancellationToken cancellationToken) =>
        Reply(await customerService.GetMonthlyActivityAsync(cancellationToken));

    [HttpGet("purchases")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<PurchaseModel>>>> GetCustomerPurchases(
        [FromQuery] Guid customerId, CancellationToken cancellationToken) =>
        Reply(await customerService.GetCustomerPurchasesAsync(customerId, cancellationToken));

    [HttpPost("purchase")]
    public async Task<ActionResult<ResponseModel<object>>> PurchaseProduct([FromQuery] Guid customerId,
        [FromQuery] Guid productId, CancellationToken cancellationToken) =>
        Reply(await customerService.PurchaseProductAsync(customerId, productId, Username, cancellationToken));

    [HttpPatch("update")]
    public async Task<ActionResult<ResponseModel<object>>> UpdateCustomer([FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken) =>
        Reply(await customerService.UpdateCustomerAsync(request, Username, cancellationToken));

    [HttpPatch("deactivate")]
    public async Task<ActionResult<ResponseModel<object>>> DeactivateCustomer([FromQuery] Guid customerId,
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeactivateCustomerAsync(customerId, Username, cancellationToken));

    [HttpPatch("reactivate")]
    public async Task<ActionResult<ResponseModel<object>>> ReactivateCustomer([FromQuery] Guid customerId,
        CancellationToken cancellationToken) =>
        Reply(await customerService.ReactivateCustomerAsync(customerId, Username, cancellationToken));

    [HttpDelete("delete")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteCustomer([FromQuery] Guid customerId,
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeleteCustomerAsync(customerId, Username, cancellationToken));

    [Authorize(Roles = "1801")]
    [HttpDelete("audit-log/all")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteAllCustomerAuditLog(
        CancellationToken cancellationToken) =>
        Reply(await customerService.DeleteAllCustomerAuditLogAsync(cancellationToken));
}
