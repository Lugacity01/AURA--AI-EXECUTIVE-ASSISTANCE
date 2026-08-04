import Link from "next/link";
import { headers } from "next/headers";
import { ReactNode } from "react";

export default async function ContactsLayout({ children }: { children: ReactNode }) {
  const currentPath = (await headers()).get("x-invoke-path") || "";

  const tabs = [
    { name: "All Contacts", href: "/dashboard/contacts", exact: true },
    { name: "Organizations", href: "/dashboard/contacts/organizations" },
    { name: "Groups", href: "/dashboard/contacts/groups" },
    { name: "Tags", href: "/dashboard/contacts/tags" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F0F12]">
      {/* Header / Tabs */}
      <div className="border-b border-white/10 px-8 pt-8">
        <h1 className="text-2xl font-medium text-white mb-6">Contacts</h1>
        <div className="flex gap-6">
          {tabs.map((tab) => {
            // Very simple active state heuristic since we don't have usePathname in Server Component
            // A better way is using a client component for the tabs, but this works for a shell
            const isActive = tab.exact 
              ? currentPath === tab.href 
              : currentPath.startsWith(tab.href);
              
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-white text-white"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {children}
      </div>
    </div>
  );
}
