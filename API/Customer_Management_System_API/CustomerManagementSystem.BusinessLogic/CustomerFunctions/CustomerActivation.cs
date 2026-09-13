using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerActivation(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> DeactivateCustomer(string guid, string merchantId)
    {
        if (string.IsNullOrEmpty(guid) || GuidValidation.ValidateGuid(guid) == false)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        var response = await dbUtils.DeactivateCustomer(guid);

        if (response.Status == 200)
            await auditLogger.Log(guid, merchantId, "Deactivated");

        return response;
    }

    public async Task<ResponseModel<object>> ReactivateCustomer(string guid, string merchantId)
    {
        if (string.IsNullOrEmpty(guid) || GuidValidation.ValidateGuid(guid) == false)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        var response = await dbUtils.ReactivateCustomer(guid);

        if (response.Status == 200)
            await auditLogger.Log(guid, merchantId, "Reactivated");

        return response;
    }
}