export interface DisclaimerProps {
  code: string;
  onAccepted: () => void;
}

export const Disclaimer = (props: DisclaimerProps) => {
  return (
    <div className="p-6 grid gap-y-8">
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Warning!</strong>
        <span className="block sm:inline">
          {" "}
          Executing code from the internet can be dangerous. Please ensure you
          understand the risks and have taken necessary precautions.
        </span>
      </div>

      <pre className="p-6 border-2 overflow-auto">{props.code}</pre>

      <div className="flex justify-end">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => props.onAccepted()}
        >
          Run code
        </button>
      </div>
    </div>
  );
};
