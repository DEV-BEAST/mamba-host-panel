'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@mambaPanel/ui';
import { useTenants, useCurrentTenant, useSwitchTenant, useCreateTenant } from '@/hooks/use-api';
import { cn } from '@mambaPanel/ui/lib/utils';

export function TenantSwitcher() {
  const [open, setOpen] = useState(false);
  const [showNewTenantDialog, setShowNewTenantDialog] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');

  const { data: tenants = [], isLoading: loadingTenants } = useTenants();
  const { data: currentTenant } = useCurrentTenant();
  const switchTenant = useSwitchTenant();
  const createTenant = useCreateTenant();

  const handleSwitchTenant = async (tenantId: string) => {
    await switchTenant.mutateAsync(tenantId);
    setOpen(false);
  };

  const handleCreateTenant = async () => {
    if (!newTenantName.trim()) return;

    await createTenant.mutateAsync({ name: newTenantName });
    setNewTenantName('');
    setShowNewTenantDialog(false);
  };

  if (loadingTenants) {
    return (
      <div className="flex items-center gap-2 px-2">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <Dialog open={showNewTenantDialog} onOpenChange={setShowNewTenantDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a tenant"
            className="w-[200px] justify-between"
          >
            <span className="truncate">
              {currentTenant?.name || 'Select tenant'}
            </span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search tenant..." />
              <CommandEmpty>No tenant found.</CommandEmpty>
              <CommandGroup heading="Tenants">
                {tenants.map((tenant: any) => (
                  <CommandItem
                    key={tenant.id}
                    onSelect={() => handleSwitchTenant(tenant.id)}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        currentTenant?.id === tenant.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{tenant.name}</span>
                      <span className="text-xs text-muted-foreground">{tenant.role}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowNewTenantDialog(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Tenant
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create tenant</DialogTitle>
          <DialogDescription>
            Create a new tenant to manage servers and team members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tenant name</Label>
            <Input
              id="name"
              placeholder="Acme Gaming"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowNewTenantDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateTenant}
            disabled={!newTenantName.trim() || createTenant.isPending}
          >
            {createTenant.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
