import ActionLink from "../../ui/ActionLink/ActionLink";

const NotFoundCard = () => {
  return (
    <div className="animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-900/60 p-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        404
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-50">
        Page not found
      </h2>
      <p className="mt-3 text-sm text-slate-400">
        The page you are looking for does not exist.
      </p>
      <ActionLink to="/" className="mt-6">
        Back to dashboard
      </ActionLink>
    </div>
  );
};

export default NotFoundCard;
