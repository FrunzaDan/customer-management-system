export const environment = {
  apiUrl: 'https://localhost:7145',
  // Same pattern as the API's RegexConstants.EmailRegex, so the form rejects exactly
  // what the API would.
  emailRegex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
  phoneNumberRegex: '^[0-9]{9,12}$',
  usernameRegex: '^[a-zA-Z0-9 ]*$',
};
