# Avoid barrel imports (UI kit, icons)

**Impact:** CRITICAL

Import kit components per folder and icons by name. Do not add an app-wide barrel that re-exports the whole kit or icon set. This repo already follows this pattern.

**Incorrect:**

```typescript
import { Button, Select } from "@/components/common"; // app-wide kit barrel
import * as Icons from "lucide-react";
```

**Correct:**

```typescript
import { Button } from "@/components/common/Button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/common/Select";
import { Plus } from "lucide-react";
```

Vite has no Next.js `optimizePackageImports` — per-folder kit imports and named icon imports are the SSOT here.
