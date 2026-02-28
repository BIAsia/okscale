import { Footer } from '../components/Footer';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { Nav } from '../components/Nav';
import { OklchQuickCompareCard } from '../components/OklchQuickCompareCard';
import { WhyOklch } from '../components/WhyOklch';

type LandingPageProps = {
  baseHex: string;
  onNavigate: (to: string) => void;
};

export function LandingPage(props: LandingPageProps) {
  return (
    <div class="page-wrap">
      <Nav mode="landing" onNavigate={props.onNavigate} />
      <div id="hero">
        <Hero
          onOpenApp={function () {
            props.onNavigate('/app');
          }}
        />
      </div>
      <OklchQuickCompareCard onNavigate={props.onNavigate} />
      <WhyOklch baseHex={props.baseHex} />
      <HowItWorks
        onOpenApp={function () {
          props.onNavigate('/app');
        }}
      />
      <Footer mode="landing" onNavigate={props.onNavigate} />
    </div>
  );
}
