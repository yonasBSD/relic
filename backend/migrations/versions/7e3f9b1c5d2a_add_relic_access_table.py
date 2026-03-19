"""add relic access table

Revision ID: 7e3f9b1c5d2a
Revises: 556bd97b2ada
Create Date: 2026-03-19 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7e3f9b1c5d2a'
down_revision: Union[str, Sequence[str], None] = '556bd97b2ada'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create relic_access table for restricted access control."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'relic_access' not in tables:
        op.create_table(
            'relic_access',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('relic_id', sa.String(32), nullable=False),
            sa.Column('client_id', sa.String(32), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['client_id'], ['client_key.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['relic_id'], ['relic.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('relic_id', 'client_id', name='unique_relic_client_access')
        )
        op.create_index(op.f('ix_relic_access_relic_id'), 'relic_access', ['relic_id'], unique=False)
        op.create_index(op.f('ix_relic_access_client_id'), 'relic_access', ['client_id'], unique=False)
    else:
        print("Alembic Skip: Table 'relic_access' already exists")


def downgrade() -> None:
    """Drop relic_access table."""
    op.drop_index(op.f('ix_relic_access_client_id'), table_name='relic_access')
    op.drop_index(op.f('ix_relic_access_relic_id'), table_name='relic_access')
    op.drop_table('relic_access')
