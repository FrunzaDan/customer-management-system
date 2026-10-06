using System.Text;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.BusinessLogic.Features.Purchases;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CustomerManagementSystem.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomerController : ApiControllerBase
{
    private string Username => User.Identity!.Name!;

    [HttpPost("create")]
    public async Task<ActionResult<ResponseModel<Guid?>>> CreateCustomer(
        [FromBody] CreateCustomerRequest request, [FromServices] CreateCustomerHandler handler,
        CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(request, Username, cancellationToken));

    [HttpGet("get")]
    public async Task<ActionResult<ResponseModel<CustomerModel>>> GetCustomer([FromQuery] string? searchTerm,
        [FromServices] GetCustomerHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(searchTerm, cancellationToken));

    [HttpGet("all")]
    public async Task<ActionResult<ResponseModel<PagedResponse<CustomerModel>>>> GetCustomers(
        [FromQuery] GetCustomersRequest request, [FromServices] GetCustomersHandler handler,
        CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(request, cancellationToken));

    [HttpGet("export")]
    public async Task<IActionResult> ExportCustomers([FromQuery] ExportCustomersRequest request,
        [FromServices] ExportCustomersHandler handler, CancellationToken cancellationToken)
    {
        var response = await handler.HandleAsync(request, cancellationToken);
        if (response is not { Status: 200, Data: { } csv })
            return Reply(response);

        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", $"customers_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    [HttpGet("audit-log")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<AuditLogEntry>>>> GetCustomerAuditLog(
        [FromQuery] Guid customerId, [FromServices] GetCustomerAuditLogHandler handler,
        CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(customerId, cancellationToken));

    [HttpGet("audit-log/all")]
    public async Task<ActionResult<ResponseModel<PagedResponse<GlobalAuditLogEntry>>>> GetAllCustomerAuditLog(
        [FromServices] GetAllCustomerAuditLogHandler handler,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default) =>
        Reply(await handler.HandleAsync(pageNumber, pageSize, cancellationToken));

    [HttpGet("insights")]
    public async Task<ActionResult<ResponseModel<CustomerInsightsModel>>> GetCustomerInsights(
        [FromServices] GetCustomerInsightsHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(cancellationToken));

    [HttpGet("purchases")]
    public async Task<ActionResult<ResponseModel<IReadOnlyList<PurchaseModel>>>> GetCustomerPurchases(
        [FromQuery] Guid customerId, [FromServices] GetCustomerPurchasesHandler handler,
        CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(customerId, cancellationToken));

    [HttpPost("purchase")]
    public async Task<ActionResult<ResponseModel<object>>> PurchaseProduct([FromQuery] Guid customerId,
        [FromQuery] Guid productId, [FromQuery] DateTimeOffset? purchasedAt,
        [FromServices] PurchaseProductHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(customerId, productId, purchasedAt?.UtcDateTime, Username,
            cancellationToken));

    [HttpPatch("update")]
    public async Task<ActionResult<ResponseModel<object>>> UpdateCustomer([FromBody] UpdateCustomerRequest request,
        [FromServices] UpdateCustomerHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(request, Username, cancellationToken));

    [HttpPatch("deactivate")]
    public async Task<ActionResult<ResponseModel<object>>> DeactivateCustomer([FromQuery] Guid customerId,
        [FromServices] DeactivateCustomerHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(customerId, Username, cancellationToken));

    [HttpPatch("reactivate")]
    public async Task<ActionResult<ResponseModel<object>>> ReactivateCustomer([FromQuery] Guid customerId,
        [FromServices] ReactivateCustomerHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(customerId, Username, cancellationToken));

    [HttpDelete("delete")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteCustomer([FromQuery] Guid customerId,
        [FromServices] DeleteCustomerHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(customerId, Username, cancellationToken));

    [Authorize(Roles = "1801")]
    [HttpDelete("audit-log/all")]
    public async Task<ActionResult<ResponseModel<object>>> DeleteAllCustomerAuditLog(
        [FromServices] DeleteAllCustomerAuditLogHandler handler, CancellationToken cancellationToken) =>
        Reply(await handler.HandleAsync(cancellationToken));
}
