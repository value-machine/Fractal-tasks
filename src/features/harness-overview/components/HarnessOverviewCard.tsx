import { Link } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/Card";
import { formContentWidthClassName } from "@/shared/theme/appViewLayout";
import { cn } from "@/shared/utils/cn";

const HARNESS_OVERVIEW_PAGE_PATH = "/harness";
const HARNESS_OVERVIEW_PREVIEW_PATH = "/harness-overview.png";

/**
 * Welcome card on the home page that points first-time visitors at the harness overview route.
 * Shown to every visitor until a fork deletes this feature (see the feature README).
 */
export const HarnessOverviewCard = () => {
  return (
    <Card
      hoverable={false}
      className={cn(
        formContentWidthClassName,
        "mb-3 shrink-0 gap-3 overflow-hidden py-0 text-left"
      )}
    >
      <img
        src={HARNESS_OVERVIEW_PREVIEW_PATH}
        alt="Flowchart of how work moves through the harness, from request to preview to your verdict"
        loading="lazy"
        className="h-24 w-full border-b object-cover object-top"
      />
      <CardContent className="flex flex-col gap-2 pb-4">
        <CardTitle>New here?</CardTitle>
        <CardDescription>
          See how requests move from idea to a preview you can test, and where you step in.
        </CardDescription>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto sm:self-start">
          <Link to={HARNESS_OVERVIEW_PAGE_PATH}>See how the harness works</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
