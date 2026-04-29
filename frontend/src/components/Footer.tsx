const Footer = () => (
  <footer className="border-t border-border/50 py-4 md:py-8">
    <div className="container mx-auto text-center px-4">
      <p className="text-muted-foreground text-xs md:text-sm">
        © {new Date().getFullYear()} Nitheesh Bopparaju. Built with passion and AI.
      </p>
    </div>
  </footer>
);

export default Footer;
