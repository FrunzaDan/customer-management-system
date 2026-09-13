using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerDeletion(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> DeleteCustomer(string guid, string merchantId)
    {
        if (string.IsNullOrEmpty(guid) || GuidValidation.ValidateGuid(guid) == false)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        var response = await dbUtils.DeleteCustomer(guid);

        // No FK from tbl_customer_audit_log to tbl_customers, deliberately — this row
        // is the one place that outlives the customer it's about.
        if (response.Status == 200)
            await auditLogger.Log(guid, merchantId, "Deleted");

        return response;
    }
}