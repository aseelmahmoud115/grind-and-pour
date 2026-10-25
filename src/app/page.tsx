import { FindYourCup } from "@/components/FindYourCup";
import { Film } from "@/components/Film";
import { Ratios } from "@/components/Ratios";
import { StepIndicator } from "@/components/StepIndicator";
import { GrindCopy } from "@/components/scenes/GrindCopy";
import { PourCopy } from "@/components/scenes/PourCopy";
import { SipCopy } from "@/components/scenes/SipCopy";

export default function Home() {
  return (
    <>
      <StepIndicator />
      <main id="main">
        <Film description="Animation, played as one continuous film while you scroll: whole coffee beans fall into a burr grinder and pile up on the table. The grinder separates into its parts: the bean hopper, the burr set, the motor and the grounds bin. A black gooseneck kettle then pours hot water in slow spirals over the grounds in a ceramic dripper, and coffee drips into a glass server. Finally, brewed coffee drips from the dripper into a sweeping, glossy wave of coffee.">
          <GrindCopy />
          <PourCopy />
          <SipCopy />
        </Film>
        <Ratios />
        <FindYourCup />
      </main>
    </>
  );
}
