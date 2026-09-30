using System.Data;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

internal static class SqlParameterExtensions
{
    public static void AddGuid(this SqlParameterCollection parameters, string name, Guid? value) =>
        parameters.Add(name, SqlDbType.UniqueIdentifier).Value = (object?)value ?? DBNull.Value;

    public static void AddNVarChar(this SqlParameterCollection parameters, string name, int size, string? value) =>
        parameters.Add(name, SqlDbType.NVarChar, size).Value = (object?)value ?? DBNull.Value;

    public static void AddVarChar(this SqlParameterCollection parameters, string name, int size, string? value) =>
        parameters.Add(name, SqlDbType.VarChar, size).Value = (object?)value ?? DBNull.Value;

    public static void AddInt(this SqlParameterCollection parameters, string name, int value) =>
        parameters.Add(name, SqlDbType.Int).Value = value;

    public static void AddSmallInt(this SqlParameterCollection parameters, string name, short? value) =>
        parameters.Add(name, SqlDbType.SmallInt).Value = (object?)value ?? DBNull.Value;

    public static void AddTinyInt(this SqlParameterCollection parameters, string name, byte? value) =>
        parameters.Add(name, SqlDbType.TinyInt).Value = (object?)value ?? DBNull.Value;

    public static void AddDate(this SqlParameterCollection parameters, string name, DateOnly? value) =>
        parameters.Add(name, SqlDbType.Date).Value = (object?)value ?? DBNull.Value;

    public static void AddDateTime2(this SqlParameterCollection parameters, string name, DateTime? value)
    {
        var parameter = parameters.Add(name, SqlDbType.DateTime2);
        parameter.Scale = 3;
        parameter.Value = (object?)value ?? DBNull.Value;
    }

    public static void AddDecimal(this SqlParameterCollection parameters, string name, byte precision, byte scale,
        decimal value)
    {
        var parameter = parameters.Add(name, SqlDbType.Decimal);
        parameter.Precision = precision;
        parameter.Scale = scale;
        parameter.Value = value;
    }
}

internal static class SqlDataReaderExtensions
{
    public static Guid GetGuid(this SqlDataReader reader, string column) =>
        reader.GetGuid(reader.GetOrdinal(column));

    public static Guid? GetNullableGuid(this SqlDataReader reader, string column)
    {
        var ordinal = reader.GetOrdinal(column);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    public static string GetString(this SqlDataReader reader, string column) =>
        reader.GetString(reader.GetOrdinal(column));

    public static string? GetNullableString(this SqlDataReader reader, string column)
    {
        var ordinal = reader.GetOrdinal(column);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    /// <summary>Like <see cref="GetNullableString"/>, but also null when the result has no such column.</summary>
    public static string? GetOptionalString(this SqlDataReader reader, string column)
    {
        for (var ordinal = 0; ordinal < reader.FieldCount; ordinal++)
        {
            if (string.Equals(reader.GetName(ordinal), column, StringComparison.OrdinalIgnoreCase))
                return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }

        return null;
    }

    public static int GetInt32(this SqlDataReader reader, string column) =>
        reader.GetInt32(reader.GetOrdinal(column));

    public static short GetInt16(this SqlDataReader reader, string column) =>
        reader.GetInt16(reader.GetOrdinal(column));

    public static byte GetByte(this SqlDataReader reader, string column) =>
        reader.GetByte(reader.GetOrdinal(column));

    public static decimal GetDecimal(this SqlDataReader reader, string column) =>
        reader.GetDecimal(reader.GetOrdinal(column));

    public static DateOnly GetDateOnly(this SqlDataReader reader, string column) =>
        reader.GetFieldValue<DateOnly>(reader.GetOrdinal(column));

    public static DateOnly? GetNullableDateOnly(this SqlDataReader reader, string column)
    {
        var ordinal = reader.GetOrdinal(column);
        return reader.IsDBNull(ordinal) ? null : reader.GetFieldValue<DateOnly>(ordinal);
    }

    public static DateTime GetUtcDateTime(this SqlDataReader reader, string column) =>
        DateTime.SpecifyKind(reader.GetDateTime(reader.GetOrdinal(column)), DateTimeKind.Utc);

    public static byte[] GetBytes(this SqlDataReader reader, string column) =>
        reader.GetFieldValue<byte[]>(reader.GetOrdinal(column));
}
