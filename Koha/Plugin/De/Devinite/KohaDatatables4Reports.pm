package Koha::Plugin::De::Devinite::KohaDatatables4Reports;

use Modern::Perl;
use base qw(Koha::Plugins::Base);

our $VERSION = "0.1.0";

our $metadata = {
    name            => 'Reports with added DataTables Functionality',
    author          => 'Markus Majer',
    date_authored   => '2026-01-21',
    date_updated    => '2026-02-13',
    minimum_version => '24.11.00.000',
    maximum_version => undef,
    version         => $VERSION,
    description     => 'Adds an interactive DataTables view to Koha report results with added features.',
};

sub new {
    my ( $class, $args ) = @_;
    $args->{'metadata'} = $metadata;
    $args->{'metadata'}->{'class'} = $class;
    my $self = $class->SUPER::new($args);
    return $self;
}

sub install {
    my ( $self, $args ) = @_;
    return 1;
}

sub upgrade {
    my ( $self, $args ) = @_;
    return 1;
}

sub uninstall {
    my ( $self, $args ) = @_;
    return 1;
}

sub configure {
    my ( $self, $args ) = @_;
    my $template = $self->get_template({ file => 'configure.tt' });
    $self->output_html( $template->output() );
}

sub intranet_js {
    my ( $self ) = @_;
    my $js = $self->mbf_read('Datatables4Reports.js');
    return "<script>$js</script>";
}

sub intranet_head {
    my ( $self ) = @_;
    my $css = $self->mbf_read('Datatables4Reports.css');
    return "<style>$css</style>";
}

1;
