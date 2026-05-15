import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Save, Trash2, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TemplatePreview } from "./TemplatePreview";

interface TemplateArea {
  name: string;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoRotation?: number;
  logoScale?: number;
}

export interface ProductTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  areas: TemplateArea[];
  isCustom?: boolean;
}

interface TemplateSelectorProps {
  builtInTemplates: ProductTemplate[];
  customTemplates: ProductTemplate[];
  onApply: (template: ProductTemplate) => void;
  onDeleteCustom: (templateId: string) => void;
  onSaveClick: () => void;
  hasAreas: boolean;
}

export function TemplateSelector({
  builtInTemplates,
  customTemplates,
  onApply,
  onDeleteCustom,
  onSaveClick,
  hasAreas,
}: TemplateSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          <LayoutTemplate className="h-4 w-4 mr-1" />
          Templates
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Tipo de Produto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {builtInTemplates.map((template) => (
            <HoverCard key={template.id} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <DropdownMenuItem
                  onClick={() => onApply(template)}
                  className="cursor-pointer"
                >
                  <template.icon className="h-4 w-4 mr-2" />
                  {template.name}
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {template.areas.length}
                  </Badge>
                </DropdownMenuItem>
              </HoverCardTrigger>
              <HoverCardContent side="right" align="start" className="w-auto p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <template.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{template.name}</span>
                  </div>
                  <TemplatePreview areas={template.areas} />
                  <div className="space-y-0.5">
                    {template.areas.map((area, idx) => (
                      <div key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px]">
                          {idx + 1}
                        </span>
                        {area.name} ({area.logoWidth}x{area.logoHeight}cm)
                      </div>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </DropdownMenuGroup>

        {customTemplates.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Meus Templates</DropdownMenuLabel>
            <DropdownMenuGroup>
              {customTemplates.map((template) => (
                <HoverCard key={template.id} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <DropdownMenuItem className="cursor-pointer group">
                      <div
                        className="flex items-center flex-1"
                        onClick={() => onApply(template)}
                      >
                        <User className="h-4 w-4 mr-2 text-primary" />
                        {template.name}
                        <Badge variant="secondary" className="ml-auto text-[10px] mr-2">
                          {template.areas.length}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon" aria-label="Excluir"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustom(template.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </DropdownMenuItem>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-auto p-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <TemplatePreview areas={template.areas} />
                      <div className="space-y-0.5">
                        {template.areas.map((area, idx) => (
                          <div key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px]">
                              {idx + 1}
                            </span>
                            {area.name} ({area.logoWidth}x{area.logoHeight}cm)
                          </div>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSaveClick}
          className="cursor-pointer text-primary"
          disabled={!hasAreas}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Posicionamento Atual
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
