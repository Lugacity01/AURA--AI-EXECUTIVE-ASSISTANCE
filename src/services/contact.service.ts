import { prisma } from "../lib/prisma";

export class ContactService {
  /**
   * Fetches the CRM contacts memory database.
   */
  static async getContacts(userId: string) {
    return prisma.contact.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });
  }

  /**
   * Updates a contact's custom notes and preferences.
   */
  static async updateContactNotes(contactId: string, notes: string) {
    return prisma.contact.update({
      where: { id: contactId },
      data: { notes }
    });
  }

  /**
   * Registers a new contact memory.
   */
  static async createContact(userId: string, data: { name: string; email: string; company?: string; phone?: string; notes?: string }) {
    return prisma.contact.create({
      data: {
        userId,
        name: data.name,
        email: data.email,
        company: data.company || "",
        phone: data.phone || "",
        notes: data.notes || ""
      }
    });
  }
}
