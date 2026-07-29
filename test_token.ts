import { TokenManager } from './src/services/gmail/token-manager';
async function main() {
  try {
    const token = await TokenManager.getValidAccessToken('PwXFxgkecq0MMb5kdn0bQH87mXLqSA5Y');
    console.log("Token acquired:", token.substring(0, 15) + '...');
  } catch (err) {
    console.error(err);
  }
}
main()
