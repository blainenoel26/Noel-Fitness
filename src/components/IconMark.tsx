export function Mark({ scale }: { scale: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1115",
        color: "#ff6b35",
        fontSize: 300 * scale,
        fontWeight: 800,
        letterSpacing: -10 * scale,
      }}
    >
      AS
    </div>
  );
}
